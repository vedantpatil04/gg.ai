import client from "./client";

export type MessageSenderRole = "citizen" | "authority" | "administrator";

export interface MessageRecord {
  _id: string;
  complaintId: string;
  senderId: string;
  senderRole: "citizen" | "authority";
  senderName: string;
  body: string;
  attachments?: string[];
  readBy?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ComplaintMessagesResponse {
  success: boolean;
  data: {
    messages: MessageRecord[];
    canSend: boolean;
  };
}

export interface SendMessageResponse {
  success: boolean;
  data: {
    message: MessageRecord;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

export interface UnreadCountsResponse {
  success: boolean;
  data: {
    counts: Record<string, number>;
  };
}

export const messageApi = {
  getMessages: (complaintId: string): Promise<ComplaintMessagesResponse> =>
    client.get(`/complaints/${complaintId}/messages`).then((r) => r.data),

  sendMessage: (complaintId: string, body: string): Promise<SendMessageResponse> =>
    client.post(`/complaints/${complaintId}/messages`, { body }).then((r) => r.data),

  markRead: (complaintId: string): Promise<{ success: boolean }> =>
    client.patch(`/complaints/${complaintId}/messages/read`).then((r) => r.data),

  getUnreadCount: (complaintId: string): Promise<UnreadCountResponse> =>
    client.get(`/complaints/${complaintId}/messages/unread-count`).then((r) => r.data),

  getUnreadCounts: (): Promise<UnreadCountsResponse> =>
    client.get("/complaints/messages/unread-counts").then((r) => r.data),
};

export default messageApi;
