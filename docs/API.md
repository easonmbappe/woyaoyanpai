# 窝腰烟牌 - API 文档

## HTTP API

### 创建房间
`POST /api/room/create`

**Request Body**
```json
{
  "playerName": "玩家名",
  "avatarId": "avatar-1"
}
```

**Response**
```json
{
  "roomId": "123456",
  "playerId": "uuid"
}
```

## WebSocket 事件

### 客户端 → 服务端
- `room:join` `{ roomId, playerName, avatarId }`
- `room:leave` `{ roomId, playerId }`
- `room:kick` `{ roomId, playerId, targetId }`
- `room:start` `{ roomId, playerId }`
- `player:ready` `{ roomId, playerId }`
- `game:action` `{ roomId, playerId, action }`
- `game:chat` `{ roomId, message }`

### 服务端 → 客户端
- `room:updated`
- `room:error`
- `game:started`
- `game:state`
- `game:actionResult`
- `game:ended`
- `player:disconnected`
- `player:reconnected`

## 备注
- 所有状态以服务端为准，客户端仅做展示。
- 手牌仅发给对应玩家，旁观者与其他玩家仅展示占位符。
