import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import {
  call,
  scriptPool,
  signIn,
  withRouter,
} from "../test-support/route-harness";
import eventsRouter from "./events";

const guest = { id: 7, role: "user" };
let savedFlag: string | undefined;

beforeEach(() => {
  savedFlag = process.env.ONLINE_PAYMENTS_ENABLED;
  process.env.ONLINE_PAYMENTS_ENABLED = "true";
});

afterEach(() => {
  if (savedFlag === undefined) delete process.env.ONLINE_PAYMENTS_ENABLED;
  else process.env.ONLINE_PAYMENTS_ENABLED = savedFlag;
});

interface World {
  going?: boolean;
  ticketPaid?: boolean;
  ticketsOnSale?: boolean;
}

function scriptWorld({ going = false, ticketPaid = false, ticketsOnSale = true }: World = {}) {
  return scriptPool((sql) => {
    if (sql.startsWith("SELECT key, name, description, amount_cents, active FROM paid_offers")) {
      return {
        rows: [
          {
            key: "activity_ticket",
            name: "Activity ticket",
            description: "",
            amount_cents: 1000,
            active: ticketsOnSale,
          },
        ],
      };
    }
    if (sql.startsWith("SELECT 1 FROM paid_offer_purchases")) {
      return { rows: ticketPaid ? [{}] : [] };
    }
    if (sql.startsWith("SELECT 1 FROM event_attendees")) {
      return { rows: going ? [{}] : [] };
    }
    if (sql.startsWith("SELECT EXISTS(")) {
      return { rows: [{ attending: going, attendee_count: 3 }] };
    }
    if (sql.startsWith("INSERT INTO event_attendees")) {
      return { rows: [{ event_id: 9, status: "GOING" }] };
    }
    if (sql.startsWith("UPDATE event_attendees SET status = 'CANCELLED'")) {
      return { rows: [{ event_id: 9 }] };
    }
    return undefined;
  });
}

const serve = (fn: (origin: string) => Promise<void>) =>
  withRouter(eventsRouter, fn, { path: "/api/events" });

const rsvp = (origin: string, method: string, path = "/api/events/9/rsvp") =>
  call(origin, method, path, { headers: signIn(guest) });

test("joining needs a ticket once tickets are on sale", async () => {
  const pool = scriptWorld();
  await serve(async (origin) => {
    const response = await rsvp(origin, "POST");
    assert.equal(response.status, 402);
    assert.equal(response.body.code, "PAYMENT_REQUIRED");
  });
  assert.equal(pool.matching("INSERT INTO event_attendees").length, 0);
});

test("joining is free while tickets are not on sale", async () => {
  scriptWorld({ ticketsOnSale: false });
  await serve(async (origin) => {
    assert.equal((await rsvp(origin, "POST")).status, 201);
  });
});

test("someone who paid and was taken off the list rejoins without paying again", async () => {
  scriptWorld({ ticketPaid: true });
  await serve(async (origin) => {
    assert.equal((await rsvp(origin, "POST")).status, 201);
  });
});

test("a paid ticket cannot be cancelled from the page", async () => {
  const pool = scriptWorld({ going: true, ticketPaid: true });
  await serve(async (origin) => {
    const response = await rsvp(origin, "DELETE");
    assert.equal(response.status, 409);
    assert.equal(response.body.code, "TICKET_PAID");
  });
  assert.equal(pool.matching("UPDATE event_attendees").length, 0);
});

test("a free RSVP can still be cancelled", async () => {
  const pool = scriptWorld({ going: true });
  await serve(async (origin) => {
    assert.equal((await rsvp(origin, "DELETE")).status, 200);
  });
  assert.equal(pool.matching("UPDATE event_attendees").length, 1);
});

test("RSVP status says whether the ticket is paid", async () => {
  await serve(async (origin) => {
    scriptWorld({ going: true, ticketPaid: true });
    const paid = await rsvp(origin, "GET", "/api/events/9/rsvp/status");
    assert.equal(paid.status, 200);
    assert.deepEqual(paid.body.data, {
      attending: true,
      attendee_count: 3,
      ticketPaid: true,
    });

    scriptWorld({ going: true });
    const free = await rsvp(origin, "GET", "/api/events/9/rsvp/status");
    assert.equal(free.body.data.ticketPaid, false);

    const bad = await rsvp(origin, "GET", "/api/events/nope/rsvp/status");
    assert.equal(bad.status, 400);
  });
});
