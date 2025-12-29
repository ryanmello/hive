import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

export const api = {
  // Transactions
  //   async getTransactions(params?: { startDate?: string; endDate?: string }) {
  //     const headers = await getAuthHeaders()
  //     const queryParams = new URLSearchParams(params as Record<string, string>)
  //     const response = await fetch(
  //       `${API_URL}/api/v1/transactions?${queryParams}`,
  //       { headers }
  //     )
  //     if (!response.ok) throw new Error('Failed to fetch transactions')
  //     return response.json()
  //   },
  //   async syncTransactions() {
  //     const headers = await getAuthHeaders()
  //     const response = await fetch(`${API_URL}/api/v1/transactions/sync`, {
  //       method: 'POST',
  //       headers,
  //     })
  //     if (!response.ok) throw new Error('Failed to sync transactions')
  //     return response.json()
  //   },
  // Accounts
  //   async getAccounts() {
  //     const headers = await getAuthHeaders()
  //     const response = await fetch(`${API_URL}/api/v1/accounts`, { headers })
  //     if (!response.ok) throw new Error('Failed to fetch accounts')
  //     return response.json()
  //   },
  // Plaid
  //   async createLinkToken() {
  //     const headers = await getAuthHeaders()
  //     const response = await fetch(`${API_URL}/api/v1/plaid/link-token`, {
  //       method: 'POST',
  //       headers,
  //     })
  //     if (!response.ok) throw new Error('Failed to create link token')
  //     return response.json()
  //   },
  //   async exchangePublicToken(publicToken: string) {
  //     const headers = await getAuthHeaders()
  //     const response = await fetch(`${API_URL}/api/v1/plaid/exchange`, {
  //       method: 'POST',
  //       headers,
  //       body: JSON.stringify({ public_token: publicToken }),
  //     })
  //     if (!response.ok) throw new Error('Failed to exchange token')
  //     return response.json()
  //   },
  // Spending
  //   async getSpendingSummary(period?: string) {
  //     const headers = await getAuthHeaders()
  //     const response = await fetch(
  //       `${API_URL}/api/v1/spending/summary${period ? `?period=${period}` : ''}`,
  //       { headers }
  //     )
  //     if (!response.ok) throw new Error('Failed to fetch spending summary')
  //     return response.json()
  //   },
};
