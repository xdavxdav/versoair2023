import { useCountries } from "../../hooks/use-analytics";

export function TestCountries() {
  const { data: countries, isLoading, error } = useCountries();

  if (isLoading)
    return <div className="text-sm text-gray-600">Loading countries...</div>;
  if (error)
    return <div className="text-sm text-red-600">Error: {error.message}</div>;

  return (
    <div>
      <h4 className="font-semibold text-green-600 mb-2">✅ API Connected!</h4>
      <p className="text-xs text-gray-600 mb-2">
        Countries data loaded successfully:
      </p>
      <div className="space-y-1">
        {countries?.map((country: any) => (
          <div
            key={country.id}
            className="flex justify-between text-xs border-b pb-1"
          >
            <span className="font-medium">{country.name}</span>
            <span className="text-gray-500">{country.code}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Total: {countries?.length || 0} countries
      </div>
    </div>
  );
}
