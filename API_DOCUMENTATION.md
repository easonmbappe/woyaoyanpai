# 窝腰烟牌 - 人机模式联调 API 文档

## 概览
- 协议：HTTP + Socket.IO（JSON）
- Socket.IO 地址：`ws://localhost:3001`
- 无需登录：连接后服务端下发临时 `playerId`

## HTTP API

### 创建房间（可选）
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

### 服务端 → 客户端
1. `connection` → `{ playerId, roomId? }`
2. `game:state` → `GameState`（完整状态，用于断线重连）
3. `game:deal` → `HeroDeal`（仅发给 Hero，含两张底牌）
4. `game:community` → `{ cards: Card[], stage }`
5. `game:turn` → `{ playerId, timeout }`
6. `game:actionResult` → `ActionResult`
7. `game:showdown` → `ShowdownResult`
8. `game:newRound` → `NewRound`
9. `game:start` → `GameState`（新局开始的完整状态）
10. `game:error` → `{ message }`

### 客户端 → 服务端
1. `room:create` → `{ playerName, avatarId?, smallBlind?, bigBlind?, isSolo, botCount }`
2. `room:join` → `{ roomId, playerName, avatarId? }`
3. `room:ready` → `{}`
4. `room:start` → `{}`
5. `game:action` → `PlayerAction`
6. `game:chat` → `{ message }`

## 数据结构

### Card
```json
{
  "suit": "hearts",
  "rank": "7"
}
```

### Player
```json
{
  "id": "uuid",
  "name": "玩家名",
  "avatar": "avatar-1",
  "chips": 1000,
  "bet": 20,
  "status": "active",
  "cards": [],
  "position": 0,
  "handRank": "顺子",
  "isWinner": false
}
```

### GameState
```json
{
  "roomId": "123456",
  "stage": "flop",
  "pot": 120,
  "currentBet": 20,
  "dealerPosition": 0,
  "activePlayerPosition": 2,
  "communityCards": ["Card"],
  "players": ["Player"],
  "minBet": 10
}
```

说明：非 Hero 玩家在非 Showdown 阶段 `cards` 为空数组。

### PlayerAction
```json
{
  "type": "raise",
  "amount": 40
}
```

说明：人机模式请传 `isSolo: true` 且 `botCount: 5`，服务端会自动补齐 AI。

### HeroDeal
```json
{
  "playerId": "uuid",
  "cards": [
    { "suit": "spades", "rank": "A" },
    { "suit": "hearts", "rank": "K" }
  ]
}
```

### Community Payload
```json
{
  "cards": [
    { "suit": "spades", "rank": "A" },
    { "suit": "hearts", "rank": "K" },
    { "suit": "diamonds", "rank": "Q" }
  ],
  "stage": "flop"
}
```

### Turn Payload
```json
{
  "playerId": "uuid",
  "timeout": 45
}
```

### ActionResult
```json
{
  "playerId": "uuid",
  "action": { "type": "call", "amount": 20 },
  "pot": 140,
  "roundBet": 20,
  "chips": 980,
  "status": "active"
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
        { "suit": "spades", "rank": "A" },
        { "suit": "hearts", "rank": "K" }
      ],
      "handRank": "顺子"
    }
  ]
}
```

### NewRound
```json
{
  "roomId": "123456",
  "dealerPosition": 0,
  "smallBlind": 10,
  "bigBlind": 20,
  "pot": 0,
  "communityCards": [],
  "stage": "preflop",
  "players": ["Player"]
}
```

## 联调流程
1. `game:newRound` → `game:start` → `game:deal` → `game:turn`
2. 多轮 `game:actionResult` / `game:turn`
3. `game:community`（flop → turn → river）
4. `game:showdown`
5. 点击“下一把”后 `room:start` 触发新一轮 `game:newRound`

## 运行方式
```bash
npm install
npm run dev
```
