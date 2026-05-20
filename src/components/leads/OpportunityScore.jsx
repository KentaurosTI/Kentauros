import Badge from '../ui/Badge';
import { getOpportunityScore } from '../../services/continuousImprovement';

const OpportunityScore = ({ lead, compact = false }) => {
  const score = getOpportunityScore(lead);
  const variant = score.total >= 70 ? 'success' : score.total >= 45 ? 'warning' : 'secondary';

  return (
    <div className={compact ? 'flex items-center gap-xs' : 'flex flex-col gap-xs'}>
      <Badge variant={variant}>{score.total}/100</Badge>
      {!compact && (
        <div className="text-xs text-muted">
          {score.recommendation}
        </div>
      )}
    </div>
  );
};

export default OpportunityScore;
