export default function useGaugeVotesQuery() {
  return {
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  };
}
