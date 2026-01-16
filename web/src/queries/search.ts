import { getOpenSearchDatasets, getOpenSearchJobs, getSearch } from '../store/requests/search'
import { useQuery } from '@tanstack/react-query'

export const useSearch = (q: string, filter = 'ALL', sort = 'NAME', limit = 100) => {
  return useQuery({
    queryKey: ['search', q, filter, sort, limit],
    queryFn: () => getSearch(q, filter, sort, limit),
    enabled: q.length > 0,
  })
}

export const useOpenSearchJobs = (q: string) => {
  return useQuery({
    queryKey: ['openSearchJobs', q],
    queryFn: () => getOpenSearchJobs(q),
    enabled: q.length > 0,
  })
}

export const useOpenSearchDatasets = (q: string) => {
  return useQuery({
    queryKey: ['openSearchDatasets', q],
    queryFn: () => getOpenSearchDatasets(q),
    enabled: q.length > 0,
  })
}
