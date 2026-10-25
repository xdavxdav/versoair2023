import { Redirect, useSearch } from "wouter";

export default function SignInSimple() {
  const search = useSearch();
  const query = search ? `?${search}` : "";

  return <Redirect to={`/auth/signin${query}`} />;
}
