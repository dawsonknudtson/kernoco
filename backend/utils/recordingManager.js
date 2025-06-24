const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class RecordingManager {
  constructor() {
    this.activeRecordings = new Map();
    this.recordingsDir = path.join(__dirname, '../uploads/recordings');
    this.ensureRecordingsDirectory();
  }

  async ensureRecordingsDirectory() {
    try {
      await fs.ensureDir(this.recordingsDir);
      console.log('Recordings directory ensured:', this.recordingsDir);
    } catch (error) {
      console.error('Error creating recordings directory:', error);
    }
  }

  generateFilename(meetingId, format = 'webm') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `meeting_${meetingId}_${timestamp}.${format}`;
  }

  async startRecording(meetingId, options = {}) {
    try {
      if (this.activeRecordings.has(meetingId)) {
        throw new Error('Recording already in progress for this meeting');
      }

      const recordingId = uuidv4();
      const filename = this.generateFilename(meetingId);
      const filePath = path.join(this.recordingsDir, filename);

      const recordingData = {
        id: recordingId,
        meetingId,
        filename,
        filePath,
        status: 'starting',
        startTime: new Date(),
        fileSize: 0,
        duration: 0,
        process: null
      };

      // Create a placeholder recording process
      // In a real implementation, this would capture WebRTC streams
      // For now, we'll simulate the recording process
      recordingData.process = this.createMockRecordingProcess(filePath, recordingData);

      this.activeRecordings.set(meetingId, recordingData);

      console.log(`Recording started for meeting ${meetingId}:`, {
        recordingId,
        filename,
        filePath
      });

      return {
        success: true,
        recordingId,
        filename,
        status: 'recording'
      };

    } catch (error) {
      console.error('Error starting recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  createMockRecordingProcess(filePath, recordingData) {
    // This simulates a recording process
    // In production, this would be replaced with actual WebRTC stream capture (not rn though)
    const mockProcess = {
      kill: () => {
        console.log('Mock recording process killed');
        clearInterval(mockProcess.interval);
      }
    };

    // Create a mock video file that grows over time
    let fileSize = 0;
    mockProcess.interval = setInterval(async () => {
      try {
        fileSize += Math.random() * 1024 * 1024; // Random size increase
        recordingData.fileSize = fileSize;
        recordingData.duration = Math.floor((Date.now() - recordingData.startTime) / 1000);
        recordingData.status = 'recording';

        // Create/update the file with some dummy content
        await fs.writeFile(filePath, Buffer.alloc(Math.floor(fileSize), 0));
      } catch (error) {
        console.error('Error updating mock recording file:', error);
      }
    }, 2000);

    return mockProcess;
  }

  async stopRecording(meetingId) {
    try {
      const recording = this.activeRecordings.get(meetingId);
      
      if (!recording) {
        throw new Error('No active recording found for this meeting');
      }

      // Stop the recording process
      if (recording.process && recording.process.kill) {
        recording.process.kill();
      }

      // Update recording status
      recording.status = 'processing';
      recording.endTime = new Date();
      recording.duration = Math.floor((recording.endTime - recording.startTime) / 1000);

      // Get final file stats
      try {
        const stats = await fs.stat(recording.filePath);
        recording.fileSize = stats.size;
      } catch (error) {
        console.error('Error getting file stats:', error);
      }

      // Simulate processing time
      setTimeout(async () => {
        recording.status = 'completed';
        console.log(`Recording completed for meeting ${meetingId}:`, {
          duration: recording.duration,
          fileSize: recording.fileSize,
          filename: recording.filename
        });
      }, 3000);

      // Remove from active recordings but keep reference for completion
      this.activeRecordings.delete(meetingId);

      return {
        success: true,
        recordingId: recording.id,
        filename: recording.filename,
        duration: recording.duration,
        fileSize: recording.fileSize,
        status: recording.status
      };

    } catch (error) {
      console.error('Error stopping recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getRecordingStatus(meetingId) {
    const recording = this.activeRecordings.get(meetingId);
    
    if (!recording) {
      return {
        success: false,
        error: 'No recording found for this meeting'
      };
    }

    return {
      success: true,
      status: recording.status,
      duration: recording.duration,
      fileSize: recording.fileSize,
      filename: recording.filename
    };
  }

  async getRecordingFile(filename) {
    try {
      const filePath = path.join(this.recordingsDir, filename);
      const exists = await fs.pathExists(filePath);
      
      if (!exists) {
        throw new Error('Recording file not found');
      }

      const stats = await fs.stat(filePath);
      
      return {
        success: true,
        filePath,
        fileSize: stats.size,
        mimeType: this.getMimeType(filename)
      };

    } catch (error) {
      console.error('Error getting recording file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.webm': 'video/webm',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async deleteRecording(filename) {
    try {
      const filePath = path.join(this.recordingsDir, filename);
      await fs.remove(filePath);
      
      return {
        success: true,
        message: 'Recording deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all active recordings
  getActiveRecordings() {
    const recordings = [];
    this.activeRecordings.forEach((recording, meetingId) => {
      recordings.push({
        meetingId,
        recordingId: recording.id,
        status: recording.status,
        duration: recording.duration,
        fileSize: recording.fileSize,
        startTime: recording.startTime
      });
    });
    return recordings;
  }

  // Check disk space
  async checkDiskSpace() {
    try {
      const stats = await fs.stat(this.recordingsDir);
      // This is a simplified check - in production you'd want more sophisticated disk space monitoring
      return {
        success: true,
        available: true // Simplified for demo
      };
    } catch (error) {
      return {
        success: false,
        available: false,
        error: error.message
      };
    }
  }
}

module.exports = RecordingManager; 