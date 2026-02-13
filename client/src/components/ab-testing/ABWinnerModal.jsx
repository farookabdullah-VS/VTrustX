import { X, Trophy, TrendingUp, BarChart3 } from 'lucide-react';
import './ABWinnerModal.css';

/**
 * A/B Winner Modal
 *
 * Celebration modal shown when a winner is declared.
 * Displays:
 * - Trophy icon and winner name
 * - Lift percentage
 * - Statistical details
 * - Actions (apply winner, view results)
 */
export default function ABWinnerModal({ winnerData, experiment, onClose }) {
    const handleApplyWinner = () => {
        // TODO: Implementation to copy winning content to new distribution
        alert('Apply Winner functionality coming soon! This will create a new distribution using the winning variant content.');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button className="modal-close" onClick={onClose}>
                    <X size={24} />
                </button>

                {/* Trophy icon */}
                <div className="modal-icon">
                    <div className="trophy-circle">
                        <Trophy size={48} />
                    </div>
                </div>

                {/* Content */}
                <div className="modal-body">
                    <h2>We Have a Winner! 🎉</h2>
                    <p className="winner-announcement">
                        Variant <strong>{winnerData.winnerName}</strong> has achieved statistical significance
                    </p>

                    {/* Lift badge */}
                    {winnerData.lift && (
                        <div className="lift-badge">
                            <TrendingUp size={24} />
                            <div className="lift-content">
                                <span className="lift-value">+{winnerData.lift.toFixed(1)}%</span>
                                <span className="lift-label">Improvement</span>
                            </div>
                        </div>
                    )}

                    {/* Statistical details */}
                    <div className="stats-details">
                        <div className="stat-item">
                            <span className="stat-label">P-Value</span>
                            <span className="stat-value">{winnerData.pValue?.toFixed(4) || 'N/A'}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Confidence</span>
                            <span className="stat-value">95%</span>
                        </div>
                    </div>

                    {/* Info box */}
                    <div className="info-box-modal">
                        <p>
                            This variant has demonstrated a statistically significant improvement over the control.
                            Consider using this content for future campaigns!
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="modal-actions">
                        <button className="btn-secondary-modal" onClick={onClose}>
                            <BarChart3 size={18} />
                            View Full Results
                        </button>
                        <button className="btn-primary-modal" onClick={handleApplyWinner}>
                            Apply Winner
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
