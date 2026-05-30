import { json } from "node:stream/consumers";
import { getClients } from "../socket";
import { subscriber } from "./client";

subscriber.subscribe("syncup:messages");

subscriber.on("message",(_channel,message)=>{
    const {userId, payload} = JSON.parse(message);
    const userSockets = getClients().get(userId);

    if(!userSockets) return;
    for (const ws of userSockets) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(payload))
    }
  }

});