import { Server as SocketIOServer } from 'socket.io';

class NotifyService {
  private io: SocketIOServer | null = null;

  init(io: SocketIOServer) {
    this.io = io;
  }

  broadcast(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  emitToOrg(orgId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`org:${orgId}`).emit(event, data);
    }
  }
}

export const notifyService = new NotifyService();
