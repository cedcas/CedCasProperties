import { getChatTree } from "@/lib/chat/get-chat-tree";
import { havenAiActive } from "@/lib/haven/config";
import ChatWidget from "./ChatWidget";

/**
 * Server component that fetches the chat tree from the DB and passes it to the
 * client-side ChatWidget, along with whether Haven AI is active (HAVEN_AI_ENABLED,
 * minus the HAVEN_AI_KILL kill switch). The flag decision never reaches the client as
 * anything more than this boolean — no provider name, model, or key.
 */
export default async function ChatWidgetServer() {
  const tree = await getChatTree();
  return <ChatWidget tree={tree} aiEnabled={havenAiActive()} />;
}
