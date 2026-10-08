import { PharmaContract } from '../../../chaincode/pharma-cc/src/contract';
import { MockContext, MockStub } from '../../../tests/chaincode/mockContext';
import { EventEmitter } from 'events';

export interface ChaincodeEventPayload {
  eventName: string;
  payload: any;
  txId: string;
  blockNumber: number;
}

export class FabricGatewayService extends EventEmitter {
  private contract: PharmaContract;
  private currentBlockNumber = 100;
  private isConnected = false;
  private sharedStub = new MockStub();

  constructor() {
    super();
    this.contract = new PharmaContract();
  }

  async connect(): Promise<void> {
    this.isConnected = true;
  }

  private createContext(callerOrgId: string, role: string): any {
    const ctx = new MockContext({ orgId: callerOrgId, role });
    ctx.stub = this.sharedStub;
    return ctx;
  }

  private generateTxId(): string {
    return 'tx_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  async submitTransaction(
    fnName: string,
    callerOrgId: string,
    callerRole: string,
    ...args: any[]
  ): Promise<{ result: any; txId: string; blockNumber: number }> {
    const ctx = this.createContext(callerOrgId, callerRole);
    const txId = this.generateTxId();
    this.currentBlockNumber++;

    const contractAny = this.contract as any;
    if (typeof contractAny[fnName] !== 'function') {
      throw new Error(`Chaincode function ${fnName} not found`);
    }

    const rawResult = await contractAny[fnName](ctx, ...args);
    let result = rawResult;
    try {
      result = JSON.parse(rawResult);
    } catch {
      // keep raw string
    }

    // Capture emitted event if any
    const eventsMap = (ctx.stub as any).events as Map<string, Buffer>;
    if (eventsMap && eventsMap.size > 0) {
      for (const [eventName, payloadBuf] of eventsMap.entries()) {
        const payloadStr = payloadBuf.toString();
        let payloadJson: any;
        try {
          payloadJson = JSON.parse(payloadStr);
        } catch {
          payloadJson = payloadStr;
        }

        const eventData: ChaincodeEventPayload = {
          eventName,
          payload: payloadJson,
          txId,
          blockNumber: this.currentBlockNumber
        };
        this.emit('chaincodeEvent', eventData);
        this.emit(eventName, eventData);
      }
    }

    return { result, txId, blockNumber: this.currentBlockNumber };
  }

  async evaluateTransaction(
    fnName: string,
    callerOrgId: string,
    callerRole: string,
    ...args: any[]
  ): Promise<any> {
    const ctx = this.createContext(callerOrgId, callerRole);
    const contractAny = this.contract as any;
    if (typeof contractAny[fnName] !== 'function') {
      throw new Error(`Chaincode function ${fnName} not found`);
    }

    const rawResult = await contractAny[fnName](ctx, ...args);
    try {
      return JSON.parse(rawResult);
    } catch {
      return rawResult;
    }
  }
}

export const fabricGateway = new FabricGatewayService();
