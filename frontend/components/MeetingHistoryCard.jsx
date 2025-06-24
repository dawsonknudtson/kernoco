import { useState } from 'react';

export default function MeetingHistoryCard({ recording, onDownload, isDownloading }) {
  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date and time
  const formatMeetingDateTime = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateLabel;
    if (date.toDateString() === today.toDateString()) {
      dateLabel = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
    
    const timeLabel = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `${dateLabel} at ${timeLabel}`;
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Meeting Title and Status */}
          <div className="flex items-center space-x-3 mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              {recording.meetingTitle || `Meeting ${recording.id.slice(0, 8)}`}
            </h3>
            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(recording.status)}`}>
              {recording.status.charAt(0).toUpperCase() + recording.status.slice(1)}
            </span>
          </div>
          
          {/* Meeting Description */}
          {recording.meetingDescription && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {recording.meetingDescription}
            </p>
          )}
          
          {/* Meeting Date and Time */}
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0h6m-6 0V9a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-6a2 2 0 00-2-2" />
            </svg>
            <span className="font-medium">
              {formatMeetingDateTime(recording.actualStartTime || recording.createdAt)}
            </span>
          </div>
          
          {/* Recording Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
            {/* Duration */}
            {recording.duration && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatDuration(recording.duration)}</span>
              </div>
            )}
            
            {/* File Size */}
            {recording.fileSize && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{formatFileSize(recording.fileSize)}</span>
              </div>
            )}
            
            {/* Participants */}
            {recording.participants && recording.participants.length > 0 && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>{recording.participants.length} participant{recording.participants.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            
            {/* Download Count */}
            {recording.downloadCount > 0 && (
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{recording.downloadCount} download{recording.downloadCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          {/* Participants List */}
          {recording.participants && recording.participants.length > 0 && (
            <div className="mt-3 text-sm text-gray-500">
              <span className="font-medium">Participants: </span>
              <span>{recording.participants.join(', ')}</span>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="ml-6 flex flex-col space-y-2">
          {recording.status === 'completed' && (
            <button
              onClick={() => onDownload(recording.id, recording.filename)}
              disabled={isDownloading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download</span>
                </>
              )}
            </button>
          )}
          
          {recording.status === 'processing' && (
            <div className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg flex items-center space-x-2 text-sm">
              <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Processing...</span>
            </div>
          )}
          
          {recording.status === 'failed' && (
            <div className="px-4 py-2 bg-red-100 text-red-700 rounded-lg flex items-center space-x-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Failed</span>
            </div>
          )}
          
          {/* Meeting Info Card - small preview */}
          <div className="text-xs text-gray-400 bg-gray-50 rounded p-2 max-w-48">
            <div className="font-medium text-gray-600 mb-1">Recording Info</div>
            <div>ID: {recording.id.slice(0, 8)}...</div>
            {recording.completedAt && (
              <div>Completed: {new Date(recording.completedAt).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 