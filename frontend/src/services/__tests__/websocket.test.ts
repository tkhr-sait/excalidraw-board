import { WebSocketService } from '../websocket';

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService();
  });

  afterEach(() => {
    service.disconnect();
  });

  it('should connect to websocket server', async () => {
    const connected = await service.connect('ws://localhost:3002');
    expect(connected).toBe(true);
  });

  it('should handle connection errors', async () => {
    const connected = await service.connect('ws://invalid-url');
    expect(connected).toBe(false);
  });

  it('should send and receive messages', (done) => {
    service.onMessage((data) => {
      expect(data.type).toBeDefined();
      done();
    });

    service.connect('ws://localhost:3002').then(() => {
      service.send({ type: 'test', payload: {} });
    });
  });
});