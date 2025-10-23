import { Box } from '@mui/system'
import { IState } from '../../store/reducers'
import { LineageDataset, LineageJob } from '../../types/lineage'
import { LineageGraph } from '../../types/api'
import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import DatasetDetailPage from '../../components/datasets/DatasetDetailPage'
import JobDetailPage from '../../components/jobs/JobDetailPage'

const WIDTH = 800

const TableLevelDrawer = () => {
  const [searchParams] = useSearchParams()
  const lineageGraph = useSelector((state: IState) => state.lineage.lineage)

  const node = lineageGraph.graph.find(
    (node) => node.id === searchParams.get('tableLevelNode') || ''
  )

  let dataset = null
  let job = null
  if (node?.type === 'DATASET') {
    dataset = node.data as LineageDataset
  } else if (node?.type === 'JOB') {
    job = node.data as LineageJob
  }

  return (
    <Box width={`${WIDTH}px`}>
      {dataset ? (
        <DatasetDetailPage lineageDataset={dataset} />
      ) : (
        <>{job && <JobDetailPage lineageJob={job} />}</>
      )}
    </Box>
  )
}

export default TableLevelDrawer
