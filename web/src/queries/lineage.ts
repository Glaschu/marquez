import { JobOrDataset } from '../types/lineage'
import { getLineage } from '../store/requests/lineage'
import { useQuery } from '@tanstack/react-query'

export const useLineage = (
  nodeType: JobOrDataset,
  namespace: string,
  name: string,
  depth: number
) => {
  return useQuery({
    queryKey: ['lineage', nodeType, namespace, name, depth],
    queryFn: () => getLineage(nodeType, namespace, name, depth),
  })
}
