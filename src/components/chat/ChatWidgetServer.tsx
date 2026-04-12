import { getChatTree } from "@/lib/chat/get-chat-tree";
import ChatWidget from "./ChatWidget";

/**
 * Server component that fetches the chat tree from the DB
 * and passes it to the client-side ChatWidget.
 */
export default async function ChatWidgetServer() {
  const tree = await getChatTree();
  return <ChatWidget tree={tree} />;
}
