import { apiFetch, updateServerTimeOffset } from "@/lib/apiClient";
import { auth } from "@/lib/firebase";
import {
  AnswerEntry,
  BattleAnswerLocked,
  BattleAnswerResult,
  BattleConnectionState,
  BattleMode,
  BattlePlayer,
  BattleReactionPopup,
  BattleRoomPreview,
  BattleRoomSnapshot,
  BattleRules,
  BattleSpeedHighlight,
  BattleSyncedReveal,
  PublicQuestion,
} from "@/types";

export interface CreateBattleParams {
  examId: string;
  title: string;
  questionCount: number;
  timePerQuestion: number;
  posMark: number;
  negMark: number;
  maxPlayers: number;
  mode: BattleMode;
  allowGuests: boolean;
  showExplanation: boolean;
}

export interface CreateBattleResponse {
  success: boolean;
  roomId: string;
  wsTicket: string;
  wsUrl: string;
  rules: BattleRules;
  mode: BattleMode;
}

export interface JoinBattleResponse {
  success: boolean;
  roomId: string;
  uid: string;
  wsTicket: string;
  wsUrl: string;
  roomInfo: BattleRoomPreview;
}

export async function fetchBattleRoomPreview(roomId: string): Promise<BattleRoomPreview | null> {
  try {
    const clean = roomId.trim().toUpperCase();
    const res = await apiFetch<{ success: boolean; room?: BattleRoomPreview }>(
      `/api/battle/room/${encodeURIComponent(clean)}`,
      { cache: "no-store" }
    );
    return res.room || null;
  } catch {
    return null;
  }
}

export async function createBattleRoomApi(params: CreateBattleParams): Promise<CreateBattleResponse> {
  return apiFetch<CreateBattleResponse>("/api/battle/create", {
    method: "POST",
    requireAuth: true,
    body: params,
  });
}

export async function joinBattleRoomApi(
  roomId: string,
  guestName?: string
): Promise<JoinBattleResponse> {
  return apiFetch<JoinBattleResponse>("/api/battle/join", {
    method: "POST",
    withOptionalAuth: true,
    body: {
      roomId: roomId.trim().toUpperCase(),
      guestName: guestName?.trim() || undefined,
    },
  });
}

const SESSION_KEY_PREFIX = "learnhive_battle_ws_";
const SESSION_TTL_MS = 45 * 60 * 1000;

export function saveBattleSession(
  roomId: string,
  wsUrl: string,
  myUid: string,
  guestName?: string
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${SESSION_KEY_PREFIX}${roomId.toUpperCase()}`,
      JSON.stringify({
        wsUrl,
        myUid,
        guestName: guestName?.trim() || undefined,
        savedAt: Date.now(),
      })
    );
  } catch {}
}

export function loadBattleSession(
  roomId: string
): { wsUrl: string; myUid: string; guestName?: string; savedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${roomId.toUpperCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      wsUrl: string;
      myUid: string;
      guestName?: string;
      savedAt: number;
    };
    if (Date.now() - parsed.savedAt > SESSION_TTL_MS) {
      sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${roomId.toUpperCase()}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearBattleSession(roomId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`${SESSION_KEY_PREFIX}${roomId.toUpperCase()}`);
  } catch {}
}

export interface BattleSocketCallbacks {
  onSnapshot: (snap: BattleRoomSnapshot | null) => void;
  onConnectionChange: (state: BattleConnectionState) => void;
  onAnswerResult: (res: BattleAnswerResult) => void;
  onAnswerLocked: (locked: BattleAnswerLocked) => void;
  onSyncedReveal: (reveal: BattleSyncedReveal) => void;
  onSyncedNextQuestion: (qIndex: number, deadlineMs: number) => void;
  onSpeedHighlight: (highlight: BattleSpeedHighlight) => void;
  onReaction: (reaction: BattleReactionPopup) => void;
  onError: (msg: string) => void;
}

export class BattleSocketManager {
  private ws: WebSocket | null = null;
  private roomId = "";
  private wsUrl = "";
  private myUid = "";
  private guestName?: string;
  private snapshot: BattleRoomSnapshot | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private manualClose = false;
  private callbacks: BattleSocketCallbacks;

  constructor(callbacks: BattleSocketCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(roomId: string, wsUrl: string, myUid: string, guestName?: string): void {
    this.roomId = roomId.trim().toUpperCase();
    this.wsUrl = wsUrl;
    this.myUid = myUid || auth.currentUser?.uid || "";
    this.guestName = guestName;
    this.manualClose = false;
    this.reconnectAttempt = 0;
    this.openSocket(wsUrl);
  }

  private openSocket(url: string): void {
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.onmessage = null;
        this.ws.close(1000, "Replacing socket");
      } catch {}
    }

    this.callbacks.onConnectionChange(
      this.reconnectAttempt > 0 ? "RECONNECTING" : "CONNECTING"
    );

    const sock = new WebSocket(url);
    this.ws = sock;

    sock.onopen = () => {
      if (this.ws !== sock) return;
      this.reconnectAttempt = 0;
      this.callbacks.onConnectionChange("CONNECTED");
      this.pingTimer = setInterval(() => {
        if (this.ws === sock && sock.readyState === WebSocket.OPEN) {
          try {
            sock.send("ping");
          } catch {}
        }
      }, 25_000);
    };

    sock.onmessage = (event) => {
      if (this.ws !== sock || typeof event.data !== "string") return;
      if (event.data === "pong" || event.data === '"pong"') return;
      this.handleMessage(event.data);
    };

    sock.onclose = (ev) => {
      if (this.ws !== sock) return;
      this.clearTimers();
      this.ws = null;
      if (
        !this.manualClose &&
        ev.code !== 1000 &&
        ev.code !== 4001 &&
        this.snapshot?.status !== "finished"
      ) {
        this.scheduleReconnect();
      } else {
        this.callbacks.onConnectionChange("DISCONNECTED");
      }
    };

    sock.onerror = () => {};
  }

  private scheduleReconnect(): void {
    if (this.manualClose) return;

    if (!this.snapshot && this.reconnectAttempt >= 2) {
      clearBattleSession(this.roomId);
      this.callbacks.onConnectionChange("DISCONNECTED");
      this.callbacks.onError("রুমটি খুঁজে পাওয়া যায়নি অথবা মেয়াদ শেষ হয়েছে।");
      return;
    }

    if (this.reconnectAttempt >= 6) {
      this.callbacks.onConnectionChange("DISCONNECTED");
      this.callbacks.onError("ইন্টারনেট সংযোগ বিচ্ছিন্ন হয়েছে। রিলোড করে আবার চেষ্টা করুন।");
      return;
    }

    this.reconnectAttempt += 1;
    this.callbacks.onConnectionChange("RECONNECTING");
    const delayMs = Math.min(this.reconnectAttempt * 1500, 6000);

    this.reconnectTimer = setTimeout(async () => {
      if (this.manualClose) return;

      if (this.wsUrl && this.reconnectAttempt <= 4) {
        this.openSocket(this.wsUrl);
        return;
      }

      if (auth.currentUser) {
        try {
          const joined = await joinBattleRoomApi(this.roomId);
          this.wsUrl = joined.wsUrl;
          this.myUid = joined.uid || this.myUid;
          saveBattleSession(this.roomId, joined.wsUrl, this.myUid);
          this.openSocket(joined.wsUrl);
          return;
        } catch {}
      } else if (this.guestName && this.snapshot?.status === "waiting") {
        try {
          const joined = await joinBattleRoomApi(this.roomId, this.guestName);
          this.wsUrl = joined.wsUrl;
          this.myUid = joined.uid || this.myUid;
          saveBattleSession(this.roomId, joined.wsUrl, this.myUid, this.guestName);
          this.openSocket(joined.wsUrl);
          return;
        } catch {}
      }

      if (this.wsUrl) {
        this.openSocket(this.wsUrl);
      } else {
        this.scheduleReconnect();
      }
    }, delayMs);
  }

  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private send(payload: Record<string, unknown>): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public startBattle(): boolean {
    return this.send({ type: "start_battle" });
  }

  public submitAnswer(qIndex: number, selectedIndex: number): boolean {
    const sent = this.send({ type: "submit_answer", qIndex, selectedIndex });
    if (!sent) return false;

    if (this.snapshot) {
      this.snapshot = {
        ...this.snapshot,
        myAnswers: {
          ...this.snapshot.myAnswers,
          [String(qIndex)]: selectedIndex,
        },
      };
      this.callbacks.onSnapshot(this.snapshot);
    }
    return true;
  }

  public sendReaction(emoji: string): boolean {
    return this.send({ type: "send_reaction", emoji });
  }

  public nextSyncedQuestion(): boolean {
    return this.send({ type: "next_synced_question" });
  }

  public leaveRoom(): void {
    this.send({ type: "leave_room" });
    clearBattleSession(this.roomId);
    setTimeout(() => this.disconnect(), 120);
  }

  public disconnect(): void {
    this.manualClose = true;
    this.clearTimers();
    if (this.ws) {
      try {
        this.ws.close(1000, "Client closed");
      } catch {}
      this.ws = null;
    }
    this.callbacks.onConnectionChange("DISCONNECTED");
  }

  private handleMessage(raw: string): void {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = String(data.type || "");
    const resolvedUid = this.myUid || auth.currentUser?.uid || "";

    switch (type) {
      case "room_snapshot": {
        const serverTimeMs = Number(data.serverTimeMs || 0);
        if (serverTimeMs > 0) updateServerTimeOffset(serverTimeMs);

        const myState = (data.myState as Record<string, unknown>) || {};
        const serverAnswers = (myState.answers as Record<string, number>) || {};
        const mergedAnswers =
          Object.keys(serverAnswers).length > 0
            ? serverAnswers
            : this.snapshot?.myAnswers || {};

        const rankings = (data.rankings as BattlePlayer[]) || [];
        const status = (data.status as BattleRoomSnapshot["status"]) || "waiting";
        let winnerUid = (data.winnerUid as string | null) ?? null;
        if (!winnerUid && status === "finished" && rankings.length >= 2) {
          const active = rankings.filter((p) => p.correctCount + p.wrongCount > 0);
          if (active.length >= 2 && rankings[0].score > rankings[1].score) {
            winnerUid = rankings[0].uid;
          }
        }

        this.snapshot = {
          roomId: String(data.roomId || this.roomId),
          examId: String(data.examId || ""),
          examTitle: String(data.examTitle || "Group Battle"),
          hostUid: String(data.hostUid || ""),
          myUid: resolvedUid,
          status,
          mode: (data.mode as BattleMode) || "RACE",
          allowGuests: data.allowGuests !== false,
          showExplanation: data.showExplanation !== false,
          startedAtMs: Number(data.startedAtMs || 0),
          rules: (data.rules as BattleRules) || {
            questionCount: 10,
            timePerQuestion: 15,
            posMark: 10,
            negMark: 2,
            maxPlayers: 20,
          },
          players: (data.players as BattlePlayer[]) || [],
          questions: (data.questions as PublicQuestion[]) || [],
          syncedQIndex: Number(data.syncedQIndex || 0),
          syncedPhase: (data.syncedPhase as "QUESTION" | "REVEAL") || "QUESTION",
          syncedDeadlineMs: Number(data.syncedDeadlineMs || 0),
          myQIndex: Number(myState.qIndex || 0),
          myQStartedAtMs: Number(myState.qStartedAtMs || 0),
          myScore: Number(myState.score || 0),
          myStreak: Number(myState.streak || 0),
          myHasFinished: Boolean(myState.hasFinished),
          myAnswers: mergedAnswers,
          winnerUid,
          podiumTop3: (data.podiumTop3 as BattlePlayer[]) || [],
          rankings,
          solutionsMap: (data.solutionsMap as Record<string, AnswerEntry>) || {},
        };
        this.callbacks.onSnapshot(this.snapshot);
        break;
      }

      case "player_joined": {
        if (!this.snapshot) return;
        const player = data.player as BattlePlayer | undefined;
        if (!player) return;
        const hostUid = String(data.hostUid || this.snapshot.hostUid);
        const list = [...this.snapshot.players];
        const idx = list.findIndex((p) => p.uid === player.uid);
        if (idx >= 0) list[idx] = player;
        else list.push(player);
        this.snapshot = { ...this.snapshot, hostUid, players: list };
        this.callbacks.onSnapshot(this.snapshot);
        break;
      }

      case "player_left": {
        if (!this.snapshot) return;
        const leftUid = String(data.uid || "");
        const newHostUid = String(data.newHostUid || "");
        const permanentlyLeft = Boolean(data.permanentlyLeft);
        const players =
          this.snapshot.status === "waiting" && permanentlyLeft
            ? this.snapshot.players.filter((p) => p.uid !== leftUid)
            : this.snapshot.players.map((p) =>
                p.uid === leftUid
                  ? { ...p, isOnline: false, forfeited: permanentlyLeft, hasFinished: true }
                  : p
              );
        this.snapshot = {
          ...this.snapshot,
          hostUid: newHostUid || this.snapshot.hostUid,
          players,
        };
        this.callbacks.onSnapshot(this.snapshot);
        break;
      }

      case "player_status": {
        if (!this.snapshot) return;
        const pUid = String(data.uid || "");
        const isOnline = Boolean(data.isOnline);
        this.snapshot = {
          ...this.snapshot,
          players: this.snapshot.players.map((p) =>
            p.uid === pUid ? { ...p, isOnline } : p
          ),
        };
        this.callbacks.onSnapshot(this.snapshot);
        break;
      }

      case "host_migrated": {
        if (!this.snapshot) return;
        const newHostUid = String(data.newHostUid || "");
        if (newHostUid) {
          this.snapshot = { ...this.snapshot, hostUid: newHostUid };
          this.callbacks.onSnapshot(this.snapshot);
        }
        break;
      }

      case "battle_countdown": {
        const serverTimeMs = Number(data.serverTimeMs || 0);
        if (serverTimeMs > 0) updateServerTimeOffset(serverTimeMs);

        const startsAtMs = Number(data.startsAtMs || 0);
        const prev = this.snapshot;
        this.snapshot = {
          roomId: prev?.roomId || this.roomId,
          examId: prev?.examId || "",
          examTitle: prev?.examTitle || "Group Battle",
          hostUid: prev?.hostUid || "",
          myUid: prev?.myUid || resolvedUid,
          status: "playing",
          mode: (data.mode as BattleMode) || prev?.mode || "RACE",
          allowGuests: prev?.allowGuests ?? true,
          showExplanation: prev?.showExplanation ?? true,
          startedAtMs: startsAtMs,
          rules: (data.rules as BattleRules) || prev?.rules || {
            questionCount: 10,
            timePerQuestion: 15,
            posMark: 10,
            negMark: 2,
            maxPlayers: 20,
          },
          players: (data.players as BattlePlayer[]) || prev?.players || [],
          questions: (data.questions as PublicQuestion[]) || [],
          syncedQIndex: Number(data.syncedQIndex || 0),
          syncedPhase: "QUESTION",
          syncedDeadlineMs: Number(data.syncedDeadlineMs || 0),
          myQIndex: 0,
          myQStartedAtMs: startsAtMs,
          myScore: 0,
          myStreak: 0,
          myHasFinished: false,
          myAnswers: {},
          winnerUid: null,
          podiumTop3: [],
          rankings: [],
          solutionsMap: {},
        };
        this.callbacks.onSnapshot(this.snapshot);
        break;
      }

      case "answer_result": {
        const res: BattleAnswerResult = {
          qIndex: Number(data.qIndex || 0),
          isCorrect: Boolean(data.isCorrect),
          isTimeout: Boolean(data.isTimeout),
          correctIndices: (data.correctIndices as number[]) || [],
          explanation: String(data.explanation || ""),
          earnedPoints: Number(data.earnedPoints || 0),
          totalScore: Number(data.totalScore || 0),
          streak: Number(data.streak || 0),
          nextQIndex: Number(data.nextQIndex || 0),
          qStartedAtMs: Number(data.qStartedAtMs || 0),
          hasFinished: Boolean(data.hasFinished),
        };
        if (this.snapshot) {
          this.snapshot = {
            ...this.snapshot,
            myQIndex: res.nextQIndex,
            myQStartedAtMs: res.qStartedAtMs,
            myScore: res.totalScore,
            myStreak: res.streak,
            myHasFinished: res.hasFinished,
          };
          this.callbacks.onSnapshot(this.snapshot);
        }
        this.callbacks.onAnswerResult(res);
        break;
      }

      case "answer_locked": {
        const qIndex = Number(data.qIndex || 0);
        const selectedIndex = Number(data.selectedIndex ?? -1);
        if (this.snapshot) {
          this.snapshot = {
            ...this.snapshot,
            myAnswers: { ...this.snapshot.myAnswers, [String(qIndex)]: selectedIndex },
          };
          this.callbacks.onSnapshot(this.snapshot);
        }
        this.callbacks.onAnswerLocked({ qIndex, selectedIndex });
        break;
      }

      case "player_updated": {
        if (!this.snapshot) return;
        const pUid = String(data.uid || "");
        const pName = String(data.name || "Player");
        const speedHighlight = Boolean(data.speedHighlight);
        const speedMs = Number(data.speedMs || 0);

        this.snapshot = {
          ...this.snapshot,
          players: this.snapshot.players.map((p) =>
            p.uid === pUid
              ? {
                  ...p,
                  qIndex: Number(data.qIndex ?? p.qIndex),
                  score: Number(data.score ?? p.score),
                  streak: Number(data.streak ?? p.streak),
                  correctCount: Number(data.correctCount ?? p.correctCount),
                  wrongCount: Number(data.wrongCount ?? p.wrongCount),
                  hasFinished: Boolean(data.hasFinished),
                }
              : p
          ),
        };
        this.callbacks.onSnapshot(this.snapshot);

        if (speedHighlight && speedMs > 0) {
          this.callbacks.onSpeedHighlight({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            uid: pUid,
            name: pName,
            speedMs,
          });
        }
        break;
      }

      case "synced_reveal": {
        const qIndex = Number(data.qIndex || 0);
        const updatedPlayers = (data.players as BattlePlayer[]) || [];
        const reveal: BattleSyncedReveal = {
          qIndex,
          correctIndices: (data.correctIndices as number[]) || [],
          explanation: String(data.explanation || ""),
          nextAtMs: Number(data.nextAtMs || 0),
        };
        if (this.snapshot) {
          const me = updatedPlayers.find((p) => p.uid === resolvedUid);
          const nextAnswers = { ...this.snapshot.myAnswers };
          if (nextAnswers[String(qIndex)] === undefined) {
            nextAnswers[String(qIndex)] = -1;
          }
          this.snapshot = {
            ...this.snapshot,
            syncedPhase: "REVEAL",
            syncedDeadlineMs: reveal.nextAtMs,
            players: updatedPlayers.length > 0 ? updatedPlayers : this.snapshot.players,
            myScore: me ? me.score : this.snapshot.myScore,
            myStreak: me ? me.streak : this.snapshot.myStreak,
            myAnswers: nextAnswers,
          };
          this.callbacks.onSnapshot(this.snapshot);
        }
        this.callbacks.onSyncedReveal(reveal);
        break;
      }

      case "synced_next_question": {
        const qIndex = Number(data.qIndex || 0);
        const serverTimeMs = Number(data.serverTimeMs || 0);
        const deadlineMs = Number(data.deadlineMs || 0);
        if (serverTimeMs > 0) updateServerTimeOffset(serverTimeMs);

        if (this.snapshot) {
          this.snapshot = {
            ...this.snapshot,
            syncedQIndex: qIndex,
            syncedPhase: "QUESTION",
            syncedDeadlineMs: deadlineMs,
            myQIndex: qIndex,
            myQStartedAtMs: serverTimeMs,
          };
          this.callbacks.onSnapshot(this.snapshot);
        }
        this.callbacks.onSyncedNextQuestion(qIndex, deadlineMs);
        break;
      }

      case "reaction_popup": {
        const emoji = String(data.emoji || "");
        if (!emoji) return;
        this.callbacks.onReaction({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          uid: String(data.uid || ""),
          name: String(data.name || ""),
          emoji,
        });
        break;
      }

      case "battle_finished": {
        const rankings = (data.rankings as BattlePlayer[]) || [];
        const podium = (data.podiumTop3 as BattlePlayer[]) || [];
        const solutions = (data.solutionsMap as Record<string, AnswerEntry>) || {};
        const winnerUid = (data.winnerUid as string | null) ?? null;

        if (this.snapshot) {
          const me = rankings.find((p) => p.uid === resolvedUid);
          this.snapshot = {
            ...this.snapshot,
            status: "finished",
            winnerUid,
            podiumTop3: podium,
            rankings,
            players: rankings.length > 0 ? rankings : this.snapshot.players,
            solutionsMap: solutions,
            myScore: me ? me.score : this.snapshot.myScore,
            myHasFinished: true,
          };
          this.callbacks.onSnapshot(this.snapshot);
        }
        break;
      }

      case "error": {
        this.callbacks.onError(String(data.message || "Battle error occurred"));
        break;
      }
    }
  }
}