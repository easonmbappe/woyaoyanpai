# 窝腰烟牌 - 人机模式 API 文档

## 概览
- 协议：HTTP + Socket.IO（JSON 负载）
- Socket.IO 入口：`ws://<host>:<port>`（同 HTTP 端口）
- 状态以服务端为准，客户端仅做展示

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
  - `playerName` 用于断线重连识别
- `room:leave` `{ roomId, playerId }`
- `room:kick` `{ roomId, playerId, targetId }`（仅房主）
- `player:ready` `{ roomId, playerId }`
- `room:start` `{ roomId, playerId }`（仅房主，且玩家>=2 且真人已 ready）
- `game:action` `{ roomId, playerId, action }`
- `game:chat` `{ roomId, message }`

### 服务端 → 客户端
- `room:updated` `Room`
- `room:error` `{ message }`
- `game:started` `GameState`
- `game:state` `GameState`
- `game:actionResult` `{ playerId, action }`
- `game:ended` `GameState`
- `game:newRound` `NewRoundPayload`
- `game:deal` `DealPayload`
- `game:community` `CommunityPayload`
- `game:showdown` `ShowdownResult`
- `game:reset` `ResetPayload`
- `game:error` `{ message }`
- `player:disconnected` `{ playerId }`
- `player:reconnected` `{ playerId }`
- `game:chat` `{ message }`

## 数据结构

### Card
```json
{
  "rank": "A",
  "suit": "S"
}
```

### Player
```json
{
  "id": "uuid",
  "socketId": "socket-uuid",
  "name": "玩家名",
  "avatar": "avatar-1",
  "chips": 1000,
  "status": "active",
  "handCards": [
    { "rank": "A", "suit": "S" },
    { "rank": "K", "suit": "H" }
  ],
  "isAI": false,
  "ready": true,
  "disconnectedAt": 1710000000000
}
```

### Room
```json
{
  "id": "123456",
  "hostId": "uuid",
  "players": ["Player"],
  "spectators": ["Player"],
  "status": "playing",
  "config": {
    "smallBlind": 5,
    "bigBlind": 10,
    "timeoutMs": 45000
  },
  "gameState": "GameState"
}
```

### GameState
```json
{
  "deck": ["Card"],
  "communityCards": ["Card"],
  "pot": 120,
  "sidePots": [
    { "amount": 60, "eligiblePlayerIds": ["uuid", "uuid"] }
  ],
  "currentRound": "flop",
  "dealerPos": 0,
  "activePlayerIds": ["uuid", "uuid"],
  "currentTurnPlayerId": "uuid",
  "smallBlind": 5,
  "bigBlind": 10,
  "roundBets": { "uuid": 10, "uuid": 10 },
  "totalBets": { "uuid": 30, "uuid": 30 },
  "lastRaiseAmount": 10
}
```

### GameActionPayload
```json
{
  "type": "raise",
  "amount": 40
}
```

### NewRoundPayload
```json
{
  "roomId": "123456",
  "roundId": "round-1",
  "dealerPos": 0,
  "smallBlind": 5,
  "bigBlind": 10,
  "players": ["Player"],
  "pot": 0,
  "communityCards": [],
  "currentRound": "preflop"
}
```

### DealPayload
```json
{
  "roomId": "123456",
  "roundId": "round-1",
  "playerId": "uuid",
  "handCards": [
    { "rank": "A", "suit": "S" },
    { "rank": "K", "suit": "H" }
  ],
  "currentTurnPlayerId": "uuid",
  "roundBets": { "uuid": 10, "uuid": 20 },
  "pot": 30
}
```

### CommunityPayload
```json
{
  "roomId": "123456",
  "roundId": "round-1",
  "stage": "flop",
  "communityCards": [
    { "rank": "A", "suit": "S" },
    { "rank": "K", "suit": "H" },
    { "rank": "Q", "suit": "D" }
  ],
  "pot": 120,
  "roundBets": { "uuid": 0, "uuid": 0 },
  "currentTurnPlayerId": "uuid"
}
```

### ShowdownResult
```json
{
  "winnerId": "uuid",
  "winnerName": "玩家名",
  "handRank": "顺子",
  "winAmount": 120,
  "playerHands": [
    {
      "id": "uuid",
      "name": "玩家名",
      "cards": [
        { "rank": "A", "suit": "S" },
        { "rank": "K", "suit": "H" }
      ],
      "handRank": "顺子"
    }
  ]
}
```

### ResetPayload
```json
{
  "roomId": "123456",
  "roundId": "round-1",
  "communityCards": [],
  "pot": 0,
  "roundBets": {},
  "currentTurnPlayerId": null
}
```

### 枚举值
- `PlayerStatus`：`active` `folded` `allin` `offline` `spectator`
- `RoomStatus`：`waiting` `playing` `ended`
- `RoundStage`：`preflop` `flop` `turn` `river` `showdown`
- `GameActionType`：`fold` `check` `call` `raise` `allin`

## 关键联调说明
- Hero 手牌：`room:updated` 的 `players[].handCards` 含明文手牌，前端只展示自己的手牌，非 Showdown 阶段其他人应隐藏。
- Showdown 判定：`game:ended` 当前仅下发最终 `GameState`（含 `sidePots` 和更新后的筹码），前端需根据筹码变化或后续扩展事件展示赢家。
- 下一局重置：本轮结束后由房主再次发送 `room:start` 触发新一局发牌。

## 调试工具
- Mock 数据：`tsx scripts/mockData.ts`（生成可直接用于 UI 的 `room:updated` / `game:state` JSON）
- WS 连接测试：`tsx scripts/wsTest.ts`（本地快速连通与事件回放）
