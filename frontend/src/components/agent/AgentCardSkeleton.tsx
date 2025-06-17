import React from 'react';

const AgentCardSkeleton: React.FC = () => {
  return (
    <div className="agent-card animate-pulse">
      {/* Agent Header */}
      <div className="agent-card-header">
        <div className="agent-avatar bg-gray-300"></div>
        <div className="agent-header-content">
          <div className="h-6 bg-gray-300 rounded w-3/4 mb-1"></div>
          <div className="h-4 bg-gray-300 rounded w-1/4"></div>
        </div>
      </div>

      {/* Agent Description */}
      <div className="agent-desc-container">
        <div className="h-16 bg-gray-300 rounded w-full"></div>
      </div>

      {/* Agent skills sub-cards */}
      <div className="w-full grid grid-cols-1 gap-3 mb-4 mt-3">
        <div className="h-5 bg-gray-300 rounded w-1/4 mb-2"></div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg">
            <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Interaction button */}
      <div className="agent-card-footer">
        <div className="h-10 bg-gray-300 rounded w-full"></div>
      </div>
    </div>
  );
};

export default AgentCardSkeleton;
