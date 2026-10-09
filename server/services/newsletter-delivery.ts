export interface NewsletterCampaignRow {
  id: number;
  title: string;
  subject: string | null;
  content: string | null;
}

interface NewsletterQueryResult<Row extends object = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}

export interface NewsletterDbClient {
  query<Row extends object = Record<string, unknown>>(
    query: string,
    values?: unknown[],
  ): Promise<NewsletterQueryResult<Row>>;
  release(error?: Error): void;
}

export type NewsletterDbConnection = () => Promise<NewsletterDbClient>;

export async function queueNewsletterCampaign(
  campaignId: number,
  mode: "scheduled" | "immediate",
  connect: NewsletterDbConnection,
): Promise<{ recipientCount: number } | null> {
  const client = await connect();
  let transactionOpen = false;
  let releaseError: Error | undefined;

  try {
    await client.query("BEGIN");
    transactionOpen = true;

    const eligibility =
      mode === "scheduled"
        ? "status = 'scheduled' AND scheduled_at <= NOW()"
        : "status IS DISTINCT FROM 'sent'";
    const claimedCampaign = await client.query<NewsletterCampaignRow>(
      `UPDATE newsletter_campaigns
       SET status = 'sending', updated_at = NOW()
       WHERE id = $1 AND ${eligibility}
       RETURNING id, title, subject, content`,
      [campaignId],
    );

    const campaign = claimedCampaign.rows[0];
    if (!campaign) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return null;
    }

    const queuedEmails = await client.query(
      `INSERT INTO email_queue
         (recipient_email, subject, html_body, email_type, status)
       SELECT email, $1, $2, 'newsletter', 'pending'
       FROM newsletter_subscribers
       WHERE is_active = true`,
      [
        campaign.subject || campaign.title,
        campaign.content || `<p>${campaign.title}</p>`,
      ],
    );
    const recipientCount = queuedEmails.rowCount ?? 0;

    await client.query(
      `UPDATE newsletter_campaigns
       SET status = 'sent', sent_at = NOW(), recipient_count = $1, updated_at = NOW()
       WHERE id = $2`,
      [recipientCount, campaignId],
    );

    await client.query("COMMIT");
    transactionOpen = false;
    return { recipientCount };
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        releaseError =
          rollbackError instanceof Error
            ? rollbackError
            : new Error(String(rollbackError));
        console.error(
          "[NEWSLETTER] Failed to roll back campaign transaction:",
          releaseError,
        );
      }
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}
