"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import confetti from "canvas-confetti";
import { Store, Volume2, VolumeX, Zap } from "lucide-react";
import { BirdIcon } from "@/app/_components/BirdIcon";
import { useGameScores } from "@/lib/use-game-scores";
import { getSkin, type BirdAccessory } from "@/lib/shop-items";
import { GAME_MODES, DEFAULT_MODE_ID, getGameMode, type GameModeId } from "@/lib/game-modes";
import { Shop } from "./Shop";

const GRAVITY = 1700; // px/s²
const FLAP_VELOCITY = -430; // px/s
const BIRD_RADIUS = 15;
const BIRD_X_RATIO = 0.32;
const PILLAR_WIDTH = 58;
const PILLAR_GAP = 165;
const PILLAR_MARGIN = 70; // distância mínima do centro do vão até o teto/chão (Clássico)
const FLOAT_MARGIN = 40; // margem mínima do topo/chão usada pro posicionamento vertical no modo Caos
const BASE_PILLAR_SPEED = 165; // px/s, antes de aplicar o multiplicador
const PILLAR_SPACING = 310; // distância percorrida entre pilares
const GROUND_HEIGHT = 28;
const MAX_ROTATION_UP = -0.5;
const MAX_ROTATION_DOWN = 0.9;
const GOLD_COLOR = "#f5c542";
const GOLD_COLOR_DARK = "#c9971f";
const COIN_RADIUS = 9;
const BILL_LINE_SPACING = 20; // espaçamento das linhas de "nota" na pilastra (fallback, antes das imagens carregarem)
const CASH_BAND_HEIGHT = 16; // faixa/lacre dourado no meio da pilastra (fallback)
const FLIGHT_DURATION_S = 0.65; // duração do voo do passarinho do menu até o jogo
const PILLAR_START_DELAY_MS = 1000; // pausa calma depois do pouso, antes das pilastras aparecerem

// Assets em public/game/ — dimensões nativas dos SVGs, usadas pra escalar
// corretamente ao desenhar com drawImage (largura da pilastra é PILLAR_WIDTH,
// a altura de cada um escala proporcionalmente).
const BODY_TILE_SRC = "/game/pilastra-corpo-tile.svg";
const BODY_TILE_NATIVE_W = 64;
const BODY_TILE_NATIVE_H = 96;
const CAP_SRC = "/game/pilastra-topo-moedas.svg";
const CAP_NATIVE_W = 80;
const CAP_NATIVE_H = 36;

// Fundo em paralaxe: 4 camadas (céu, nuvens, prédios, bancos), todas
// desenhadas na mesma "cena" de 480×860 — escalam pra cobrir a altura do
// canvas e ladrilham na horizontal. Cada uma rola numa fração da velocidade
// do mundo (speedFactor), do fundo bem devagar até o mais próximo mais
// rápido — é isso que dá a sensação de profundidade.
const SCENE_NATIVE_W = 480;
const SCENE_NATIVE_H = 860;
// O céu (camada-1-ceu.svg) NÃO entra na lista de camadas ladrilhadas — tem a
// moeda-sol desenhada perto da borda direita da própria arte (x=360 de 480),
// então ladrilhar horizontalmente cortava a moeda na emenda de cada cópia.
// É desenhado à parte (ver draw()), uma vez só, fixo, ancorado no canto
// superior direito com uma margem — nunca rola nem se repete.
const SKY_SRC = "/game/camada-1-ceu.svg";
const SKY_RIGHT_MARGIN = 16;
const PARALLAX_LAYERS: { src: string; speedFactor: number }[] = [
  { src: "/game/camada-2-nuvens.svg", speedFactor: 0.08 },
  { src: "/game/camada-3-predios.svg", speedFactor: 0.2 },
  { src: "/game/camada-4-bancos.svg", speedFactor: 0.42 },
];
// O chão anda na MESMA velocidade do mundo (pilastras) — é o "piso" onde
// elas pisam, então não pode ter velocidade própria como as outras camadas.
const GROUND_TEXTURE_SRC = "/game/camada-5-chao.svg";
const GROUND_TEXTURE_NATIVE_W = 480;
const GROUND_TEXTURE_NATIVE_H = 60;

// Inimigos temáticos do modo Caos — desenhados direto no canvas (sem cartão/
// fundo/borda por trás), cada um com movimento e "personalidade" próprios
// (ver updateChaosEnemyMovement). Pré-carregados uma vez, nunca no loop.
type ChaosEnemyType = "boleto" | "cartao" | "banco" | "juros" | "divida" | "cobranca";

const CHAOS_ENEMY_SRCS: Record<ChaosEnemyType, string> = {
  boleto: "/game/boleto.svg",
  cartao: "/game/cartao.svg",
  banco: "/game/banco.svg",
  juros: "/game/juros.svg",
  divida: "/game/divida.svg",
  cobranca: "/game/cobranca.svg",
};

// Raio de colisão de cada tipo — um pouco menor que o desenho (multiplicado
// pela escala atual do inimigo, relevante pro "juros" que cresce com o tempo).
const CHAOS_ENEMY_RADIUS: Record<ChaosEnemyType, number> = {
  boleto: 30,
  cartao: 30,
  banco: 38,
  juros: 26,
  divida: 32,
  cobranca: 30,
};

// Velocidade horizontal padrão (px/frame a 60fps) pros tipos sem velocidade
// própria especificada (juros, dívida, cobrança) — mesma da "velocidade
// média" do boleto.
const CHAOS_DEFAULT_SPEED = 4;
const CHAOS_WARNING_MS = 600; // aviso piscando na borda direita antes do inimigo entrar
const CHAOS_MIN_SAFE_GAP = 140; // vão vertical mínimo garantido quando 2 inimigos nascem juntos
const CHAOS_DOUBLE_SPAWN_CHANCE = 0.35; // só a partir da pontuação 15 (ver getChaosTier)
const CHAOS_JUROS_GROWTH_PER_SECOND = 0.4; // até no máx. 1.8x, alcançado em ~2s
const CHAOS_BANK_WAVE_SPEED = 0.05; // rad/frame — velocidade da onda senoidal do "banco"
const CHAOS_BANK_WAVE_AMPLITUDE = 40;
const CHAOS_DIVIDA_INITIAL_VY = -5; // impulso inicial (px/frame) — cai em arco com a gravidade
const CHAOS_DIVIDA_GRAVITY = 0.12; // px/frame², incrementa vy a cada frame
const CHAOS_COBRANCA_CHASE_FACTOR = 0.02; // fração da distância até o pássaro perseguida por frame
const CHAOS_COIN_INTERVAL = 2.2; // s — moedas soltas no modo Caos, independentes dos inimigos
const CHAOS_SHAKE_DURATION_MS = 200;
const CHAOS_SHAKE_MAGNITUDE = 6;

type ChaosTier = { types: ChaosEnemyType[]; interval: number; doubleChance: number };
const CHAOS_TIER_1: ChaosEnemyType[] = ["boleto"];
const CHAOS_TIER_2: ChaosEnemyType[] = ["boleto", "cartao", "juros", "cobranca"];
const CHAOS_TIER_3: ChaosEnemyType[] = ["boleto", "cartao", "juros", "cobranca", "banco", "divida"];

/** Dificuldade progressiva do modo Caos: mais tipos de inimigo e intervalo
 * menor conforme a pontuação sobe (ver pedido do usuário). */
function getChaosTier(score: number): ChaosTier {
  if (score < 5) return { types: CHAOS_TIER_1, interval: 1.8, doubleChance: 0 };
  if (score < 15) return { types: CHAOS_TIER_2, interval: 1.4, doubleChance: 0 };
  return { types: CHAOS_TIER_3, interval: 1.0, doubleChance: CHAOS_DOUBLE_SPAWN_CHANCE };
}

// Modo Vaivém ("Bolsa de Valores") — pilastras oscilam como cotações,
// amplitude/velocidade próprias por par (crescem com a pontuação), seta de
// direção nas tampas, linha de gráfico atrás, ticker de cotações no topo e
// eventos especiais (CRASH!/ALTA!) a partir da pontuação 10.
const OSC_MARGIN = 60; // margem do centro do vão até o teto/chão (mais justa que a do Clássico)
const OSC_AMPLITUDE_START = 40;
const OSC_AMPLITUDE_PER_SCORE = 3;
const OSC_AMPLITUDE_MAX = 140;
const OSC_SPEED_START = 0.02; // rad/frame (60fps) — ver updateOscilanteMode sobre a convenção "por frame"
const OSC_SPEED_MAX = 0.045;
const OSC_SPEED_RAMP_PER_SCORE = 0.00075; // chega no teto por volta da pontuação 33, junto com a amplitude
const OSC_CALM_PAIRS = 3; // primeiros pares da partida, mais comportados
const OSC_CALM_AMPLITUDE_MAX = 30;
const OSC_COLLISION_INSET = 2.5; // px — hitbox um pouco menor que o desenho nas laterais (só neste modo)
const OSC_ARROW_SIZE = 12;
const OSC_ARROW_OFFSET = 10; // distância da seta até a borda do vão
const OSC_ARROW_TURN_THRESHOLD = 0.15; // |cos| abaixo disso = perto da virada, seta semitransparente
const OSC_UP_COLOR = "#1f9d57";
const OSC_DOWN_COLOR = "#e02d2d";
const OSC_CHART_DOT_RADIUS = 3;

// Eventos especiais — só a partir da pontuação 10, nunca dois seguidos.
const OSC_EVENT_MIN_SCORE = 10;
const OSC_EVENT_COOLDOWN_MIN = 8; // pares
const OSC_EVENT_COOLDOWN_MAX = 12;
const OSC_EVENT_WARNING_MS = 1000; // aviso piscando 1s antes do par-evento nascer
const OSC_EVENT_MOVE_MS = 700; // duração do movimento rápido até o limite (~3x mais rápido que oscilar normalmente)

type OscEventKind = "crash" | "alta";

// Som de colisão — bem mais baixo que o volume nativo do arquivo pra não
// estourar/distorcer no alto-falante do celular.
const PUNCH_SRC = "/sounds/punch.mp3";
const PUNCH_VOLUME = 0.35;

// A cada SPEED_STEP_SCORE pontos, o multiplicador MOSTRADO na tela sobe
// SPEED_STEP_INCREMENT (ex: 5 pontos = 1.1x, 10 pontos = 1.2x...), até o teto
// de MAX_SPEED_MULTIPLIER — esse é só o número do badge, que continua "em
// degraus" de propósito (fácil de ler). O movimento de verdade usa
// currentSpeedMultiplierRef, que persegue esse alvo suavemente (ver
// updateSpeedMultiplier) em vez de saltar pro novo valor de uma vez — sem
// isso, cada marco de 5 pontos dava um "solavanco" perceptível no jogo inteiro.
const SPEED_STEP_SCORE = 5;
const SPEED_STEP_INCREMENT = 0.1;
const MAX_SPEED_MULTIPLIER = 3;
const SPEED_RAMP_PER_SECOND = 0.15; // quão rápido o multiplicador real alcança o alvo (~0,67s pra fechar um degrau de 0,1)

function getSpeedMultiplier(score: number): number {
  const raw = 1 + Math.floor(score / SPEED_STEP_SCORE) * SPEED_STEP_INCREMENT;
  return Math.min(raw, MAX_SPEED_MULTIPLIER);
}

type GameState = "idle" | "playing" | "gameover";
/**
 * Par de pilastras com vão — usado pelos modos Clássico e Vaivém (que só
 * difere por gapY oscilar em torno de gapYBase). O modo Caos não usa mais
 * este tipo — tem sua própria arquitetura (ver ChaosEnemy).
 */
type Pillar = {
  x: number;
  passed: boolean;
  coinCollected: boolean;
  /** Fase fixa do balanço da moeda, sorteada uma vez na criação — usar a
   * posição X (que muda a cada frame com o movimento) fazia a moeda "tremer"
   * em vez de balançar suave. */
  coinPhase: number;
  gapY?: number;
  /** Centro sorteado do vão no modo Vaivém — gapY oscila em torno disso
   * (recentraliza quando um evento especial termina, ver updateOscilanteMode). */
  gapYBase?: number;
  oscPhase?: number;
  /** Amplitude/velocidade PRÓPRIAS deste par (crescem com a pontuação no
   * momento em que ele nasceu — ver getOscDifficulty) — cada par "trava" a
   * dificuldade que tinha ao nascer, só a fase garante que não fiquem sincronizados. */
  oscAmplitude?: number;
  oscVelocidade?: number;
  /** Evento especial (CRASH!/ALTA!) em andamento neste par — movimento rápido
   * até o limite, depois volta a oscilar normalmente a partir de onde parou. */
  oscEventKind?: OscEventKind;
  oscEventStartedAt?: number;
  oscEventStartFrom?: number;
};
type Bird = { y: number; vy: number; rotation: number };

/**
 * Inimigo do modo Caos — cada tipo tem física própria (ver
 * updateChaosEnemyMovement): reta (boleto), girando rápido (cartão),
 * ondulando (banco), crescendo (juros), em arco (dívida) ou perseguindo o
 * pássaro (cobrança). `scale` só muda pra "juros"; os demais ficam em 1.
 */
type ChaosEnemy = {
  type: ChaosEnemyType;
  x: number;
  y: number;
  vy: number;
  rotation: number;
  scale: number;
  /** Centro da onda senoidal do "banco" — os outros tipos não usam. */
  baseY: number;
  /** Fase da onda do "banco", sorteada na criação pra não sincronizar vários. */
  phase: number;
  spawnedAt: number;
  passed: boolean;
};

/** Aviso piscando (⚠️) mostrado 0.6s antes de um inimigo entrar em cena, na
 * altura exata em que ele vai aparecer. */
type ChaosPendingWarning = {
  type: ChaosEnemyType;
  y: number;
  spawnAt: number;
};

/** Moeda solta do modo Caos — independente dos inimigos (que não têm mais um
 * "vão" pra guardar posição de moeda como as pilastras). */
type ChaosCoin = {
  x: number;
  y: number;
  phase: number;
  collected: boolean;
};

/** Evento especial do Vaivém (CRASH!/ALTA!) decidido com ~1s de antecedência
 * — o aviso pisca na tela até `triggerAt`, e só então o PRÓXIMO par que nascer
 * vira o par-evento de verdade. */
type OscPendingEvent = {
  kind: OscEventKind;
  decidedAt: number;
  triggerAt: number;
};
type ThemeColors = {
  bg: string;
  border: string;
  accent: string;
  accentStrong: string;
};

const FALLBACK_COLORS: ThemeColors = {
  bg: "#faf9f7",
  border: "#e7e4df",
  accent: "#16a34a",
  accentStrong: "#15803d",
};

function readThemeColors(): ThemeColors {
  if (typeof window === "undefined") return FALLBACK_COLORS;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    bg: read("--color-bg", FALLBACK_COLORS.bg),
    border: read("--color-border", FALLBACK_COLORS.border),
    accent: read("--color-accent", FALLBACK_COLORS.accent),
    accentStrong: read("--color-accent-strong", FALLBACK_COLORS.accentStrong),
  };
}

/**
 * Efeitos sonoros curtos (moeda, recorde) sintetizados na hora com Web
 * Audio — sem depender de arquivo nenhum, ao contrário da música de fundo
 * (essa sim é um MP3 que o usuário ainda vai providenciar). `AudioContext`
 * só existe no navegador, então isso nunca roda durante o SSR.
 */
/** Só garante que o contexto existe, sem tentar retomar (usado pra decodificar
 * áudio antecipadamente, o que não precisa de gesto do usuário nem toca nada). */
function ensureAudioContext(ref: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return null;
  if (!ref.current) ref.current = new AudioContext();
  return ref.current;
}

function getAudioContext(ref: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  const ctx = ensureAudioContext(ref);
  if (ctx && ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Toca um AudioBuffer já decodificado — usado pro som de colisão (punch.mp3),
 * decodificado com antecedência (ver efeito no componente) pra tocar sem o
 * atraso de decodificar um <audio> na hora do primeiro play(). */
function playBuffer(ctx: AudioContext, buffer: AudioBuffer, gain: number) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;
  source.connect(gainNode);
  gainNode.connect(ctx.destination);
  source.start();
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

function playCoinSound(ctx: AudioContext) {
  const now = ctx.currentTime;
  playTone(ctx, 988, now, 0.09, "square", 0.12);
  playTone(ctx, 1568, now + 0.06, 0.15, "square", 0.12);
}

function playRecordFanfare(ctx: AudioContext) {
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    playTone(ctx, freq, now + i * 0.09, 0.18, "triangle", 0.14);
  });
}

/** Sino de pregão do Vaivém — "ding" metálico curto, ao iniciar a partida e a
 * cada 10 pontos. */
function playBellDing(ctx: AudioContext) {
  playTone(ctx, 880, ctx.currentTime, 0.35, "sine", 0.16);
}

/** Som do evento especial do Vaivém: grave descendente pra "CRASH!", agudo
 * ascendente pra "ALTA!" — uma rampa de frequência, não um tom fixo. */
function playMarketEventSound(ctx: AudioContext, kind: OscEventKind) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  const [from, to] = kind === "crash" ? [520, 110] : [220, 720];
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + 0.5);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function FlappyGame({ onExit }: { onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sfxContextRef = useRef<AudioContext | null>(null);
  const colorsRef = useRef<ThemeColors>(FALLBACK_COLORS);
  const wingPathRef = useRef<Path2D | null>(null);
  const bodyTileImgRef = useRef<HTMLImageElement | null>(null);
  const capImgRef = useRef<HTMLImageElement | null>(null);
  const parallaxImgsRef = useRef<HTMLImageElement[]>([]);
  const skyImgRef = useRef<HTMLImageElement | null>(null);
  const groundTextureImgRef = useRef<HTMLImageElement | null>(null);
  const chaosImgsRef = useRef<Partial<Record<ChaosEnemyType, HTMLImageElement>>>({});
  const punchAudioRef = useRef<HTMLAudioElement | null>(null);
  // Buffer de punch.mp3 já decodificado (ver efeito abaixo) — toca via Web
  // Audio (playBuffer), sem o atraso de decodificar um <audio> na hora do
  // primeiro play(). punchAudioRef vira só um fallback improvável (buffer
  // ainda não decodificado quando a colisão acontece).
  const punchBufferRef = useRef<AudioBuffer | null>(null);
  const mutedRef = useRef(false);
  // Distância total rolada do "mundo" — nunca reseta (ao contrário de
  // distanceRef, que zera a cada pilastra nova). É o relógio único que
  // sincroniza o chão, as pilastras e as 4 camadas de fundo entre si.
  const backgroundScrollRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const birdIconRef = useRef<HTMLDivElement>(null);
  const birdControls = useAnimationControls();

  const sizeRef = useRef({ width: 360, height: 640 });
  const birdRef = useRef<Bird>({ y: 320, vy: 0, rotation: 0 });
  const pillarsRef = useRef<Pillar[]>([]);
  const distanceRef = useRef(0);
  // Estado do modo Caos — completamente separado das pilastras (Clássico/
  // Vaivém), já que os inimigos têm física própria (não são um par com vão).
  const chaosEnemiesRef = useRef<ChaosEnemy[]>([]);
  const chaosPendingRef = useRef<ChaosPendingWarning[]>([]);
  const chaosCoinsRef = useRef<ChaosCoin[]>([]);
  const chaosSpawnTimerRef = useRef(0);
  const chaosCoinTimerRef = useRef(0);
  // Trava a física (bird/inimigos) durante o screen shake de ~200ms entre a
  // colisão e o game over de fato — a tela continua desenhando (com o
  // tremor), só para de mover.
  const freezeRef = useRef(false);
  const screenShakeRef = useRef({ active: false, startTime: 0 });
  // Estado do modo Vaivém ("Bolsa de Valores") — relógio próprio em "frames"
  // (não segundos de relógio, ver updateOscilanteMode) que alimenta o seno de
  // cada par; contador de pares desde o início (pra saber quais são os 3
  // "calmos") e desde o último evento especial (pra sortear o próximo);
  // histórico de todos os centros de vão já passados, pro mini-gráfico do
  // game over.
  const oscTimeRef = useRef(0);
  const oscPairIndexRef = useRef(0);
  const oscPairsSinceEventRef = useRef(0);
  const oscEventCooldownRef = useRef(OSC_EVENT_COOLDOWN_MIN);
  const oscPendingEventRef = useRef<OscPendingEvent | null>(null);
  const oscLastWasEventRef = useRef(false);
  const oscBellScoreRef = useRef(0); // último múltiplo de 10 em que o sino já tocou
  const chartHistoryRef = useRef<number[]>([]);
  const scoreRef = useRef(0);
  const coinsRef = useRef(0);
  const gameStateRef = useRef<GameState>("idle");
  const speedMultiplierDisplayRef = useRef(1);
  // Multiplicador de velocidade REAL (usado no movimento) — persegue
  // getSpeedMultiplier(score) suavemente (ver updateSpeedMultiplier), nunca
  // salta pro valor novo de uma vez como o badge exibido faz.
  const currentSpeedMultiplierRef = useRef(1);
  const recordFanfareFiredRef = useRef(false);
  // Quando as pilastras podem começar a aparecer (performance.now() + o
  // atraso calmo depois do pouso) — setado em startGame().
  const pillarsStartAtRef = useRef(0);
  // Evita chamar startGame() duas vezes (a animação do passarinho E o timer
  // de segurança caindo quase juntos) — quem chegar primeiro "vence".
  const transitionStartedRef = useRef(false);
  // Modo escolhido no menu, travado no instante de startGame() — o loop do
  // jogo lê daqui, nunca do estado React (mesmo motivo de sempre).
  const gameModeRef = useRef<GameModeId>(DEFAULT_MODE_ID);

  const [gameState, setGameState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [muted, setMuted] = useState(false);
  // true assim que a pontuação passa o recorde anterior — fica assim pelo
  // resto da partida (placar destacado); showRecordBadge é só o "🏆 Novo
  // recorde!" passageiro que some sozinho depois de um tempinho.
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showRecordBadge, setShowRecordBadge] = useState(false);
  // true entre clicar "Jogar" e o passarinho terminar de voar até o lugar —
  // o menu já some, mas o jogo em si só começa quando o voo termina.
  const [transitioning, setTransitioning] = useState(false);
  // Espelha sizeRef (que existe só pro loop do jogo ler sem re-render) num
  // estado de verdade — ler ref.current durante o render não é permitido,
  // e o alvo do voo do passarinho precisa disso pra calcular a posição.
  const [canvasSize, setCanvasSize] = useState({ width: 360, height: 640 });
  // "Foto" do total de moedas no instante do game over — myCoins (do hook)
  // segue mudando depois disso (assim que o Firestore confirma a escrita),
  // então somar myCoins + coins ao vivo na tela de fim de jogo acabaria
  // contando as moedas da partida duas vezes depois que o snapshot chegasse.
  const [totalCoinsAtGameOver, setTotalCoinsAtGameOver] = useState<number | null>(null);
  // "Foto" do histórico de centros de vão do Vaivém no instante do game over
  // (chartHistoryRef segue existindo como ref só pro loop escrever; pra
  // exibir no JSX precisa de um estado de verdade, mesmo motivo do total de moedas acima).
  const [oscChartSnapshot, setOscChartSnapshot] = useState<number[]>([]);
  // Modo escolhido no menu (chip) — persiste entre partidas e ao voltar pro
  // menu via "Menu" na tela de fim de jogo (resetRunState não mexe nisso de
  // propósito). Só volta pro Clássico se a PÁGINA for desmontada/remontada
  // (sair de /jogo e voltar), já que esse estado nasce de novo nesse caso.
  const [selectedMode, setSelectedMode] = useState<GameModeId>(DEFAULT_MODE_ID);

  const { submitRun, bestByMode, myCoins, equippedBird, ownedItems } = useGameScores();
  const equippedSkin = getSkin(equippedBird);
  const ownedModes = GAME_MODES.filter((mode) => mode.id === DEFAULT_MODE_ID || ownedItems.includes(mode.id));
  const submitRunRef = useRef(submitRun);
  // Recorde do modo que ESTÁ sendo (ou acabou de ser) jogado — cada modo
  // tem o seu (ver lib/game-modes.ts), então o loop do jogo sempre indexa
  // esse mapa por gameModeRef.current, nunca um número fixo.
  const bestByModeRef = useRef(bestByMode);
  const myCoinsRef = useRef(myCoins);
  // O canvas lê a cor do skin via ref (mesmo motivo dos outros: o loop do
  // jogo não pode depender de um valor de estado "vivo" do render).
  const skinRef = useRef(getSkin(equippedBird));
  useEffect(() => {
    submitRunRef.current = submitRun;
  }, [submitRun]);
  useEffect(() => {
    bestByModeRef.current = bestByMode;
  }, [bestByMode]);
  useEffect(() => {
    myCoinsRef.current = myCoins;
  }, [myCoins]);
  useEffect(() => {
    skinRef.current = getSkin(equippedBird);
  }, [equippedBird]);
  const [shopOpen, setShopOpen] = useState(false);

  // Áudio: o arquivo ainda não existe (o usuário vai providenciar depois em
  // /public/sounds/cifrao-voador.mp3) — falha de play()/404 é engolida de
  // propósito, o jogo funciona normalmente sem som até o arquivo chegar.
  useEffect(() => {
    const audio = new Audio("/sounds/cifrao-voador.mp3");
    audio.loop = true;
    audio.volume = 0.32;
    audioRef.current = audio;

    const punch = new Audio(PUNCH_SRC);
    punch.volume = PUNCH_VOLUME;
    punchAudioRef.current = punch;

    return () => {
      audio.pause();
      punch.pause();
      // sfxContextRef é criado bem depois (só quando o jogo começa, dentro
      // de getAudioContext), então o cleanup precisa ler o valor mais atual
      // no momento do unmount — copiar pra uma variável aqui pegaria sempre
      // null, já que na montagem o contexto ainda nem existe.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      sfxContextRef.current?.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    if (punchAudioRef.current) punchAudioRef.current.muted = muted;
    mutedRef.current = muted;
  }, [muted]);

  // Decodifica punch.mp3 uma vez, assim que o componente monta — decodificar
  // não precisa de gesto do usuário (só TOCAR precisa), então dá pra deixar
  // pronto bem antes da primeira colisão em vez de decodificar na hora, que
  // era a causa do atraso perceptível no som.
  useEffect(() => {
    let cancelled = false;
    fetch(PUNCH_SRC)
      .then((res) => res.arrayBuffer())
      .then((data) => {
        const ctx = ensureAudioContext(sfxContextRef);
        return ctx?.decodeAudioData(data);
      })
      .then((decoded) => {
        if (decoded && !cancelled) punchBufferRef.current = decoded;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    colorsRef.current = readThemeColors();
    const observer = new MutationObserver(() => {
      colorsRef.current = readThemeColors();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Carrega os SVGs da pilastra (moedas empilhadas + textura de notas) uma
  // vez — o loop de desenho só olha `.complete` nativo do <img>, sem
  // precisar de estado React (não é algo que precise re-renderizar nada).
  useEffect(() => {
    const bodyImg = new Image();
    bodyImg.src = BODY_TILE_SRC;
    bodyTileImgRef.current = bodyImg;

    const capImg = new Image();
    capImg.src = CAP_SRC;
    capImgRef.current = capImg;

    const skyImg = new Image();
    skyImg.src = SKY_SRC;
    skyImgRef.current = skyImg;

    parallaxImgsRef.current = PARALLAX_LAYERS.map((layer) => {
      const img = new Image();
      img.src = layer.src;
      return img;
    });

    const groundImg = new Image();
    groundImg.src = GROUND_TEXTURE_SRC;
    groundTextureImgRef.current = groundImg;

    const chaosImgs: Partial<Record<ChaosEnemyType, HTMLImageElement>> = {};
    (Object.entries(CHAOS_ENEMY_SRCS) as [ChaosEnemyType, string][]).forEach(([type, src]) => {
      const img = new Image();
      img.src = src;
      chaosImgs[type] = img;
    });
    chaosImgsRef.current = chaosImgs;
  }, []);

  function resetRunState() {
    const { height } = sizeRef.current;
    birdRef.current = { y: height / 2, vy: 0, rotation: 0 };
    pillarsRef.current = [];
    distanceRef.current = PILLAR_SPACING;
    chaosEnemiesRef.current = [];
    chaosPendingRef.current = [];
    chaosCoinsRef.current = [];
    chaosSpawnTimerRef.current = 0;
    chaosCoinTimerRef.current = 0;
    freezeRef.current = false;
    screenShakeRef.current = { active: false, startTime: 0 };
    oscTimeRef.current = 0;
    oscPairIndexRef.current = 0;
    oscPairsSinceEventRef.current = 0;
    oscEventCooldownRef.current =
      OSC_EVENT_COOLDOWN_MIN + Math.floor(Math.random() * (OSC_EVENT_COOLDOWN_MAX - OSC_EVENT_COOLDOWN_MIN + 1));
    oscPendingEventRef.current = null;
    oscLastWasEventRef.current = false;
    oscBellScoreRef.current = 0;
    chartHistoryRef.current = [];
    scoreRef.current = 0;
    setScore(0);
    coinsRef.current = 0;
    setCoins(0);
    setTotalCoinsAtGameOver(null);
    setOscChartSnapshot([]);
    speedMultiplierDisplayRef.current = 1;
    currentSpeedMultiplierRef.current = 1;
    setSpeedMultiplier(1);
    recordFanfareFiredRef.current = false;
    setIsNewRecord(false);
    setShowRecordBadge(false);
    setTransitioning(false);
  }

  function startGame() {
    gameModeRef.current = selectedMode;
    resetRunState();
    gameStateRef.current = "playing";
    setGameState("playing");
    // As pilastras só começam a aparecer um pouco depois — dá tempo do
    // passarinho "assentar" na tela antes do jogo pressionar de verdade.
    pillarsStartAtRef.current = performance.now() + PILLAR_START_DELAY_MS;
    audioRef.current?.play().catch(() => {});
    const sfx = getAudioContext(sfxContextRef); // "destrava" o áudio dentro do gesto do toque
    if (selectedMode === "oscilante" && sfx && !mutedRef.current) playBellDing(sfx);
  }

  /** Volta pro menu sem jogar — usado pelo botão "Menu" na tela de fim de jogo. */
  function goToMenu() {
    resetRunState();
    gameStateRef.current = "idle";
    setGameState("idle");
    audioRef.current?.pause();
    birdControls.set({ x: 0, y: 0, scale: 1 }); // devolve o passarinho pro lugar dele no menu
  }

  /**
   * Clique em "Jogar": mede exatamente onde o passarinho do menu está
   * (mesmo elemento, nunca desmontado) e onde o canvas vai desenhá-lo, e
   * anima esse MESMO elemento por essa distância — sem trocar de elemento
   * no meio do caminho, então ele "sai de onde está" de verdade, sem pulo.
   * O jogo só começa de fato quando o voo termina (ou o timer de segurança
   * dispara, caso o evento de animação não chegue a disparar por algum
   * motivo).
   */
  function handlePlayClick() {
    const container = containerRef.current;
    const iconEl = birdIconRef.current;
    if (container && iconEl) {
      const containerRect = container.getBoundingClientRect();
      const iconRect = iconEl.getBoundingClientRect();
      const fromCenterX = iconRect.left + iconRect.width / 2 - containerRect.left;
      const fromCenterY = iconRect.top + iconRect.height / 2 - containerRect.top;
      const toCenterX = canvasSize.width * BIRD_X_RATIO;
      const toCenterY = canvasSize.height / 2;
      const targetDiameter = BIRD_RADIUS * 2;
      birdControls
        .start(
          {
            x: toCenterX - fromCenterX,
            y: toCenterY - fromCenterY,
            scale: targetDiameter / iconRect.width,
          },
          // A curva usada antes ([0.32,0.72,0.35,1]) chegava a 100% do
          // progresso já em ~35% da duração e ficava "parada" (do tamanho
          // final) pelo resto do tempo — por isso parecia que só a posição
          // se movia. "easeOut" progride suavemente até o fim de verdade.
          { duration: FLIGHT_DURATION_S, ease: "easeOut" },
        )
        .then(handleBirdArrived);
    }
    transitionStartedRef.current = false;
    setTransitioning(true);
    window.setTimeout(
      () => {
        if (transitionStartedRef.current) return;
        transitionStartedRef.current = true;
        startGame();
      },
      FLIGHT_DURATION_S * 1000 + 150,
    );
  }

  function handleBirdArrived() {
    if (transitionStartedRef.current) return;
    transitionStartedRef.current = true;
    startGame();
  }

  function endGame() {
    gameStateRef.current = "gameover";
    setGameState("gameover");
    audioRef.current?.pause();
    if (!mutedRef.current) {
      const sfx = getAudioContext(sfxContextRef);
      const punchBuffer = punchBufferRef.current;
      if (sfx && punchBuffer) {
        playBuffer(sfx, punchBuffer, PUNCH_VOLUME);
      } else {
        // Fallback bem improvável: game over aconteceu antes do fetch/decode
        // (efeito acima) terminar — ainda tem som, só que com o atraso antigo.
        const punch = punchAudioRef.current;
        if (punch) {
          punch.currentTime = 0;
          punch.play().catch(() => {});
        }
      }
    }
    const finalScore = scoreRef.current;
    const isNewBest = finalScore > 0 && finalScore > (bestByModeRef.current[gameModeRef.current] ?? 0);
    setTotalCoinsAtGameOver(myCoinsRef.current + coinsRef.current);
    if (gameModeRef.current === "oscilante") setOscChartSnapshot([...chartHistoryRef.current]);
    void submitRunRef.current(gameModeRef.current, finalScore, coinsRef.current);
    if (isNewBest) {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.5 },
        colors: [colorsRef.current.accent, colorsRef.current.accentStrong, "#ffffff"],
      });
    }
  }

  /** `lateralInset` encolhe a hitbox nas duas laterais (só o Vaivém usa,
   * pedido explícito pra não "morrer sem encostar" — as outras modos passam 0). */
  function checkCollision(
    bird: Bird,
    pillars: Pillar[],
    width: number,
    height: number,
    lateralInset: number = 0,
  ): boolean {
    if (bird.y - BIRD_RADIUS <= 0) return true;
    if (bird.y + BIRD_RADIUS >= height - GROUND_HEIGHT) return true;
    const birdX = width * BIRD_X_RATIO;
    for (const p of pillars) {
      if (
        birdX + BIRD_RADIUS > p.x + lateralInset &&
        birdX - BIRD_RADIUS < p.x + PILLAR_WIDTH - lateralInset
      ) {
        if (p.gapY !== undefined) {
          const gapTop = p.gapY - PILLAR_GAP / 2;
          const gapBottom = p.gapY + PILLAR_GAP / 2;
          if (bird.y - BIRD_RADIUS < gapTop || bird.y + BIRD_RADIUS > gapBottom) return true;
        }
      }
    }
    return false;
  }

  /** Colisão circular do modo Caos — só o desenho do inimigo conta, nunca uma
   * área de cartão/container (não existe mais nenhum). */
  function checkChaosCollision(bird: Bird, enemies: ChaosEnemy[], birdX: number): boolean {
    for (const e of enemies) {
      const radius = CHAOS_ENEMY_RADIUS[e.type] * e.scale;
      const dx = birdX - e.x;
      const dy = bird.y - e.y;
      if (Math.sqrt(dx * dx + dy * dy) < BIRD_RADIUS + radius) return true;
    }
    return false;
  }

  /**
   * Colisão detectada: em vez de ir direto pro game over, dispara um screen
   * shake rápido (~200ms) — a física congela (freezeRef) mas o desenho
   * continua rodando com o tremor, e só DEPOIS o game over de fato acontece.
   */
  function triggerCollisionEnd() {
    if (freezeRef.current) return; // já disparado nesse frame/nos próximos
    freezeRef.current = true;
    screenShakeRef.current = { active: true, startTime: performance.now() };
    window.setTimeout(() => {
      endGame();
      freezeRef.current = false;
    }, CHAOS_SHAKE_DURATION_MS);
  }

  /** Pontuação/recorde/multiplicador de velocidade ao passar por um
   * obstáculo — compartilhado pelas pilastras (Clássico/Vaivém) e pelos
   * inimigos do Caos, que passaram a ter sua própria lista separada. */
  function registerObstaclePassed() {
    scoreRef.current += 1;
    setScore(scoreRef.current);
    const nextMultiplier = getSpeedMultiplier(scoreRef.current);
    if (nextMultiplier !== speedMultiplierDisplayRef.current) {
      speedMultiplierDisplayRef.current = nextMultiplier;
      setSpeedMultiplier(nextMultiplier);
    }
    const currentModeBest = bestByModeRef.current[gameModeRef.current] ?? 0;
    if (!recordFanfareFiredRef.current && currentModeBest > 0 && scoreRef.current === currentModeBest + 1) {
      recordFanfareFiredRef.current = true;
      setIsNewRecord(true);
      setShowRecordBadge(true);
      window.setTimeout(() => setShowRecordBadge(false), 2200);
      const sfx = getAudioContext(sfxContextRef);
      if (sfx) playRecordFanfare(sfx);
    }
  }

  function pickChaosType(types: ChaosEnemyType[]): ChaosEnemyType {
    return types[Math.floor(Math.random() * types.length)];
  }

  function schedulePendingWarning(type: ChaosEnemyType, y: number, now: number) {
    chaosPendingRef.current.push({ type, y, spawnAt: now + CHAOS_WARNING_MS });
  }

  /** Decide 1 (ou, a partir da pontuação 15, com chance de) 2 inimigos e
   * agenda o aviso de cada um — nunca gera 2 na mesma altura: quando são 2,
   * um fica acima e outro abaixo de uma faixa central de CHAOS_MIN_SAFE_GAP
   * garantida livre. */
  function scheduleChaosSpawn(tier: ChaosTier, height: number, now: number) {
    const usableTop = FLOAT_MARGIN;
    const usableBottom = height - GROUND_HEIGHT - FLOAT_MARGIN;
    const spawnDouble = tier.doubleChance > 0 && Math.random() < tier.doubleChance;

    if (spawnDouble) {
      const totalUsable = usableBottom - usableTop;
      const gapCenter = usableTop + CHAOS_MIN_SAFE_GAP / 2 + Math.random() * Math.max(totalUsable - CHAOS_MIN_SAFE_GAP, 0);
      const gapTop = gapCenter - CHAOS_MIN_SAFE_GAP / 2;
      const gapBottom = gapCenter + CHAOS_MIN_SAFE_GAP / 2;
      const y1 = usableTop + Math.random() * Math.max(gapTop - usableTop, 0);
      const y2 = gapBottom + Math.random() * Math.max(usableBottom - gapBottom, 0);
      schedulePendingWarning(pickChaosType(tier.types), y1, now);
      schedulePendingWarning(pickChaosType(tier.types), y2, now);
    } else {
      const y = usableTop + Math.random() * Math.max(usableBottom - usableTop, 0);
      schedulePendingWarning(pickChaosType(tier.types), y, now);
    }
  }

  function createChaosEnemy(type: ChaosEnemyType, y: number, width: number): ChaosEnemy {
    const img = chaosImgsRef.current[type];
    const canvasScale = sizeRef.current.height / SCENE_NATIVE_H;
    const w = (img?.naturalWidth || 90) * canvasScale;
    return {
      type,
      x: width + w,
      y,
      vy: type === "divida" ? CHAOS_DIVIDA_INITIAL_VY : 0,
      rotation: 0,
      scale: 1,
      baseY: y,
      phase: Math.random() * Math.PI * 2,
      spawnedAt: performance.now(),
      passed: false,
    };
  }

  /** Física própria de cada tipo de inimigo do Caos — FRAME normaliza os
   * valores "px/frame" do design (pensados a 60fps) pra qualquer taxa de
   * quadros: `algo * FRAME` sempre significa "algo por frame de 60fps". */
  function updateChaosEnemyMovement(enemy: ChaosEnemy, FRAME: number, bird: Bird, height: number) {
    switch (enemy.type) {
      case "boleto":
        enemy.x -= 4 * FRAME;
        break;
      case "cartao":
        enemy.x -= 6.5 * FRAME;
        enemy.rotation += 0.15 * FRAME;
        break;
      case "banco":
        enemy.x -= 2.5 * FRAME;
        enemy.phase += CHAOS_BANK_WAVE_SPEED * FRAME;
        enemy.y = enemy.baseY + Math.sin(enemy.phase) * CHAOS_BANK_WAVE_AMPLITUDE;
        break;
      case "juros": {
        enemy.x -= CHAOS_DEFAULT_SPEED * FRAME;
        enemy.rotation += 0.08 * FRAME;
        const elapsedS = (performance.now() - enemy.spawnedAt) / 1000;
        enemy.scale = Math.min(1.8, 1 + elapsedS * CHAOS_JUROS_GROWTH_PER_SECOND);
        break;
      }
      case "divida":
        enemy.vy += CHAOS_DIVIDA_GRAVITY * FRAME;
        enemy.y += enemy.vy * FRAME;
        enemy.x -= CHAOS_DEFAULT_SPEED * FRAME;
        enemy.y = Math.max(FLOAT_MARGIN, Math.min(height - GROUND_HEIGHT - FLOAT_MARGIN, enemy.y));
        break;
      case "cobranca":
        enemy.y += (bird.y - enemy.y) * CHAOS_COBRANCA_CHASE_FACTOR * FRAME;
        enemy.x -= CHAOS_DEFAULT_SPEED * FRAME;
        break;
    }
  }

  /** Loop completo do modo Caos: moedas soltas, avisos pendentes virando
   * inimigo de verdade, dificuldade progressiva e movimento/pontuação de
   * cada inimigo. Roda no lugar da lógica de pilastras (mutuamente exclusivos). */
  function updateChaosMode(dt: number, width: number, height: number, bird: Bird, speed: number, birdX: number) {
    const FRAME = dt * 60;
    const now = performance.now();

    chaosCoinTimerRef.current += dt;
    if (chaosCoinTimerRef.current >= CHAOS_COIN_INTERVAL) {
      chaosCoinTimerRef.current = 0;
      const y = FLOAT_MARGIN + Math.random() * Math.max(height - GROUND_HEIGHT - FLOAT_MARGIN * 2, 0);
      chaosCoinsRef.current.push({ x: width + COIN_RADIUS, y, phase: Math.random() * Math.PI * 2, collected: false });
    }
    for (const coin of chaosCoinsRef.current) {
      coin.x -= speed * dt;
      if (!coin.collected) {
        const dx = coin.x - birdX;
        const dy = coin.y - bird.y;
        if (Math.sqrt(dx * dx + dy * dy) < BIRD_RADIUS + COIN_RADIUS) {
          coin.collected = true;
          coinsRef.current += 1;
          setCoins(coinsRef.current);
          const sfx = getAudioContext(sfxContextRef);
          if (sfx) playCoinSound(sfx);
        }
      }
    }
    chaosCoinsRef.current = chaosCoinsRef.current.filter((c) => !c.collected && c.x > -30);

    chaosPendingRef.current = chaosPendingRef.current.filter((pending) => {
      if (now >= pending.spawnAt) {
        chaosEnemiesRef.current.push(createChaosEnemy(pending.type, pending.y, width));
        return false;
      }
      return true;
    });

    chaosSpawnTimerRef.current += dt;
    const tier = getChaosTier(scoreRef.current);
    if (chaosSpawnTimerRef.current >= tier.interval) {
      chaosSpawnTimerRef.current = 0;
      scheduleChaosSpawn(tier, height, now);
    }

    for (const enemy of chaosEnemiesRef.current) {
      updateChaosEnemyMovement(enemy, FRAME, bird, height);
      if (!enemy.passed && enemy.x < birdX) {
        enemy.passed = true;
        registerObstaclePassed();
      }
    }
    chaosEnemiesRef.current = chaosEnemiesRef.current.filter((e) => e.x > -150);
  }

  /** Amplitude/velocidade de um par NOVO do Vaivém, conforme a pontuação
   * atual — cada par trava esses valores ao nascer (ver spawnOscilantePair);
   * os primeiros OSC_CALM_PAIRS da partida têm amplitude limitada, pra dar
   * tempo do jogador se acostumar. */
  function getOscDifficulty(score: number, pairIndex: number): { amplitude: number; velocidade: number } {
    let amplitude = Math.min(OSC_AMPLITUDE_MAX, OSC_AMPLITUDE_START + score * OSC_AMPLITUDE_PER_SCORE);
    if (pairIndex < OSC_CALM_PAIRS) amplitude = Math.min(amplitude, OSC_CALM_AMPLITUDE_MAX);
    const velocidade = Math.min(OSC_SPEED_MAX, OSC_SPEED_START + score * OSC_SPEED_RAMP_PER_SCORE);
    return { amplitude, velocidade };
  }

  /**
   * Nasce um par novo do Vaivém. Se já existir um evento especial pendente
   * (CRASH!/ALTA! — decidido com ~1s de antecedência em updateOscilanteMode)
   * e o aviso já tiver terminado de piscar, ESTE par vira o par-evento: nasce
   * com oscEventKind definido, e updateOscilantePillar cuida do movimento
   * rápido até o limite em vez do seno normal.
   */
  function spawnOscilantePair(width: number, height: number, now: number) {
    const usable = height - GROUND_HEIGHT - OSC_MARGIN * 2 - PILLAR_GAP;
    const gapY = OSC_MARGIN + PILLAR_GAP / 2 + Math.random() * Math.max(usable, 0);
    const { amplitude, velocidade } = getOscDifficulty(scoreRef.current, oscPairIndexRef.current);

    const pending = oscPendingEventRef.current;
    const isEventPair = !!pending && now >= pending.triggerAt;
    let eventKind: OscEventKind | undefined;
    if (isEventPair && pending) {
      eventKind = pending.kind;
      oscPendingEventRef.current = null;
      oscLastWasEventRef.current = true;
      const sfx = getAudioContext(sfxContextRef);
      if (sfx && !mutedRef.current) playMarketEventSound(sfx, eventKind);
    } else {
      oscLastWasEventRef.current = false;
    }

    pillarsRef.current.push({
      x: width + PILLAR_WIDTH,
      gapY,
      gapYBase: gapY,
      oscPhase: Math.random() * Math.PI * 2,
      oscAmplitude: amplitude,
      oscVelocidade: velocidade,
      passed: false,
      coinCollected: false,
      coinPhase: Math.random() * Math.PI * 2,
      oscEventKind: eventKind,
      oscEventStartedAt: eventKind ? now : undefined,
      oscEventStartFrom: eventKind ? gapY : undefined,
    });
    oscPairIndexRef.current += 1;

    // Só conta pares "normais" pro cooldown do próximo evento — nunca dispara
    // dois seguidos (o par-evento reseta o contador, não o incrementa).
    if (eventKind) {
      oscPairsSinceEventRef.current = 0;
      oscEventCooldownRef.current =
        OSC_EVENT_COOLDOWN_MIN + Math.floor(Math.random() * (OSC_EVENT_COOLDOWN_MAX - OSC_EVENT_COOLDOWN_MIN + 1));
    } else {
      oscPairsSinceEventRef.current += 1;
      if (
        scoreRef.current >= OSC_EVENT_MIN_SCORE &&
        !oscPendingEventRef.current &&
        !oscLastWasEventRef.current &&
        oscPairsSinceEventRef.current >= oscEventCooldownRef.current
      ) {
        const kind: OscEventKind = Math.random() < 0.5 ? "crash" : "alta";
        oscPendingEventRef.current = { kind, decidedAt: now, triggerAt: now + OSC_EVENT_WARNING_MS };
      }
    }
  }

  /** Física de um par do Vaivém: ou o movimento rápido de um evento especial
   * em andamento, ou (o caso normal) o seno com a amplitude/velocidade
   * próprias que o par travou ao nascer. `oscTimeRef` é um relógio em
   * "frames" (não segundos de relógio) — pensado assim porque as velocidades
   * pedidas (0.02 a 0.045) são baixas demais pra gerar um vaivém perceptível
   * se aplicadas a segundos reais; como "frames a 60fps" o período fica entre
   * ~2 e ~5s, o que de fato parece um vaivém. */
  function updateOscilantePillar(p: Pillar, height: number, now: number) {
    if (p.oscEventKind && p.oscEventStartedAt !== undefined && p.oscEventStartFrom !== undefined) {
      const t = Math.min(1, (now - p.oscEventStartedAt) / OSC_EVENT_MOVE_MS);
      const eased = 1 - (1 - t) * (1 - t);
      const minGapY = OSC_MARGIN + PILLAR_GAP / 2;
      const maxGapY = height - GROUND_HEIGHT - OSC_MARGIN - PILLAR_GAP / 2;
      const target = p.oscEventKind === "crash" ? maxGapY : minGapY;
      p.gapY = p.oscEventStartFrom + (target - p.oscEventStartFrom) * eased;
      if (t >= 1) {
        // Evento terminou: volta a oscilar a partir de ONDE PAROU (sem
        // "pular") — recentraliza a base e escolhe a fase pra o seno começar
        // valendo 0 nesse instante.
        p.gapYBase = p.gapY;
        p.oscPhase = -(oscTimeRef.current * (p.oscVelocidade ?? OSC_SPEED_START));
        p.oscEventKind = undefined;
        p.oscEventStartedAt = undefined;
        p.oscEventStartFrom = undefined;
      }
      return;
    }
    if (p.gapYBase !== undefined) {
      const velocidade = p.oscVelocidade ?? OSC_SPEED_START;
      const amplitude = p.oscAmplitude ?? OSC_AMPLITUDE_START;
      const raw = p.gapYBase + Math.sin(oscTimeRef.current * velocidade + (p.oscPhase ?? 0)) * amplitude;
      const minGapY = OSC_MARGIN + PILLAR_GAP / 2;
      const maxGapY = height - GROUND_HEIGHT - OSC_MARGIN - PILLAR_GAP / 2;
      p.gapY = Math.min(maxGapY, Math.max(minGapY, raw));
    }
  }

  /** Direção atual do vão (derivada do seno) — ▲ verde quando gapY está
   * DIMINUINDO (vão subindo na tela), ▼ vermelho quando está aumentando
   * (descendo). Perto da virada (|cos| pequeno) a seta fica semitransparente.
   * Durante um evento especial a direção é a do próprio evento, sem fade. */
  function getOscDirection(p: Pillar): { up: boolean; alpha: number } | null {
    if (p.oscEventKind) return { up: p.oscEventKind === "alta", alpha: 1 };
    if (p.oscVelocidade === undefined || p.oscPhase === undefined) return null;
    const cos = Math.cos(oscTimeRef.current * p.oscVelocidade + p.oscPhase);
    return { up: cos < 0, alpha: Math.abs(cos) < OSC_ARROW_TURN_THRESHOLD ? 0.3 : 1 };
  }

  function drawOscArrow(ctx: CanvasRenderingContext2D, x: number, y: number, up: boolean, alpha: number) {
    const half = OSC_ARROW_SIZE / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = up ? OSC_UP_COLOR : OSC_DOWN_COLOR;
    ctx.beginPath();
    if (up) {
      ctx.moveTo(x, y - half);
      ctx.lineTo(x - half, y + half);
      ctx.lineTo(x + half, y + half);
    } else {
      ctx.moveTo(x, y + half);
      ctx.lineTo(x - half, y - half);
      ctx.lineTo(x + half, y - half);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Linha fina ligando os centros dos vãos dos pares visíveis (como um
   * gráfico de ações) — verde no trecho que sobe, vermelho no que desce, com
   * pontinhos em cada centro. Fica atrás das pilastras, na frente do cenário. */
  function drawOscChartLine(ctx: CanvasRenderingContext2D, pillars: Pillar[]) {
    const points = pillars.filter((p): p is Pillar & { gapY: number } => p.gapY !== undefined);
    if (points.length === 0) return;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      ctx.strokeStyle = b.gapY < a.gapY ? OSC_UP_COLOR : OSC_DOWN_COLOR;
      ctx.beginPath();
      ctx.moveTo(a.x + PILLAR_WIDTH / 2, a.gapY);
      ctx.lineTo(b.x + PILLAR_WIDTH / 2, b.gapY);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const prev = points[i - 1];
      ctx.fillStyle = prev ? (p.gapY < prev.gapY ? OSC_UP_COLOR : OSC_DOWN_COLOR) : colorsRef.current.border;
      ctx.beginPath();
      ctx.arc(p.x + PILLAR_WIDTH / 2, p.gapY, OSC_CHART_DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Aviso "CRASH! ▼" / "ALTA! ▲" no centro-direito da tela, piscando 3 vezes
   * ao longo de OSC_EVENT_WARNING_MS antes do par-evento nascer de verdade. */
  function drawOscEventWarning(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const pending = oscPendingEventRef.current;
    if (!pending) return;
    const elapsed = performance.now() - pending.decidedAt;
    if (elapsed >= OSC_EVENT_WARNING_MS) return; // já destravou, só esperando o par nascer
    const cycle = OSC_EVENT_WARNING_MS / 6; // 3 piscadas = 6 meios-ciclos
    if (Math.floor(elapsed / cycle) % 2 !== 0) return;

    const isCrash = pending.kind === "crash";
    const text = isCrash ? "CRASH! ▼" : "ALTA! ▲";
    ctx.save();
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(text, width * 0.68, height * 0.4);
    ctx.fillStyle = isCrash ? OSC_DOWN_COLOR : OSC_UP_COLOR;
    ctx.fillText(text, width * 0.68, height * 0.4);
    ctx.restore();
  }

  /** Loop completo do modo Vaivém: nascimento dos pares (incl. eventos
   * especiais), física do seno (ou do evento) de cada um, moeda seguindo o
   * vão, pontuação e sino de pregão a cada 10 pontos. Mutuamente exclusivo
   * com o Clássico/Caos. */
  function updateOscilanteMode(dt: number, width: number, height: number, bird: Bird, speed: number, birdX: number) {
    oscTimeRef.current += dt * 60;
    const now = performance.now();

    distanceRef.current += speed * dt;
    if (distanceRef.current >= PILLAR_SPACING) {
      distanceRef.current = 0;
      spawnOscilantePair(width, height, now);
    }

    for (const p of pillarsRef.current) {
      p.x -= speed * dt;
      updateOscilantePillar(p, height, now);
      if (!p.passed && p.x + PILLAR_WIDTH < birdX) {
        p.passed = true;
        if (p.gapY !== undefined) chartHistoryRef.current.push(p.gapY);
        registerObstaclePassed();
        if (scoreRef.current % 10 === 0 && oscBellScoreRef.current !== scoreRef.current) {
          oscBellScoreRef.current = scoreRef.current;
          const sfx = getAudioContext(sfxContextRef);
          if (sfx && !mutedRef.current) playBellDing(sfx);
        }
      }
      // Moeda do vão — se move junto com ele, já que usa p.gapY (recalculado
      // acima, ANTES desta checagem, a cada frame).
      if (!p.coinCollected && p.gapY !== undefined) {
        const coinX = p.x + PILLAR_WIDTH / 2;
        const dx = coinX - birdX;
        const dy = p.gapY - bird.y;
        if (Math.sqrt(dx * dx + dy * dy) < BIRD_RADIUS + COIN_RADIUS) {
          p.coinCollected = true;
          coinsRef.current += 1;
          setCoins(coinsRef.current);
          const sfx = getAudioContext(sfxContextRef);
          if (sfx) playCoinSound(sfx);
        }
      }
    }
    pillarsRef.current = pillarsRef.current.filter((p) => p.x + PILLAR_WIDTH > -10);
  }

  /** Persegue getSpeedMultiplier(score) suavemente em vez de saltar — chamada
   * uma vez por frame, antes de qualquer coisa que leia currentSpeedMultiplierRef
   * nesse mesmo frame (o scroll de fundo no rAF e o `speed` daqui de baixo). */
  function updateSpeedMultiplier(dt: number) {
    const target = getSpeedMultiplier(scoreRef.current);
    const current = currentSpeedMultiplierRef.current;
    if (current < target) {
      currentSpeedMultiplierRef.current = Math.min(target, current + SPEED_RAMP_PER_SECOND * dt);
    } else if (current > target) {
      currentSpeedMultiplierRef.current = Math.max(target, current - SPEED_RAMP_PER_SECOND * dt);
    }
  }

  function update(dt: number) {
    if (gameStateRef.current !== "playing" || freezeRef.current) return;
    const { width, height } = sizeRef.current;
    const bird = birdRef.current;

    bird.vy += GRAVITY * dt;
    bird.y += bird.vy * dt;
    bird.rotation = Math.max(MAX_ROTATION_UP, Math.min(MAX_ROTATION_DOWN, bird.vy / 500));

    const speed = BASE_PILLAR_SPEED * currentSpeedMultiplierRef.current;
    const mode = gameModeRef.current;
    const birdX = width * BIRD_X_RATIO;

    // Pausa calma logo depois do pouso — nada de nascer obstáculo antes de
    // pillarsStartAtRef (a checagem de nascimento tinha ficado FORA dessa
    // pausa antes, o que deixava o primeiro espaçamento maior que os outros).
    if (performance.now() >= pillarsStartAtRef.current) {
      if (mode === "caotico") {
        updateChaosMode(dt, width, height, bird, speed, birdX);
      } else if (mode === "oscilante") {
        updateOscilanteMode(dt, width, height, bird, speed, birdX);
      } else {
        distanceRef.current += speed * dt;
        if (distanceRef.current >= PILLAR_SPACING) {
          distanceRef.current = 0;
          const usable = height - GROUND_HEIGHT - PILLAR_MARGIN * 2 - PILLAR_GAP;
          const gapY = PILLAR_MARGIN + PILLAR_GAP / 2 + Math.random() * Math.max(usable, 0);
          pillarsRef.current.push({
            x: width + PILLAR_WIDTH,
            gapY,
            passed: false,
            coinCollected: false,
            coinPhase: Math.random() * Math.PI * 2,
          });
        }
      }
    }

    if (mode === "classico") {
      for (const p of pillarsRef.current) {
        p.x -= speed * dt;
        if (!p.passed && p.x + PILLAR_WIDTH < birdX) {
          p.passed = true;
          registerObstaclePassed();
        }
        // Moeda no centro do vão — bônus à parte da pontuação (ver useGameScores).
        if (!p.coinCollected && p.gapY !== undefined) {
          const coinX = p.x + PILLAR_WIDTH / 2;
          const dx = coinX - birdX;
          const dy = p.gapY - bird.y;
          if (Math.sqrt(dx * dx + dy * dy) < BIRD_RADIUS + COIN_RADIUS) {
            p.coinCollected = true;
            coinsRef.current += 1;
            setCoins(coinsRef.current);
            const sfx = getAudioContext(sfxContextRef);
            if (sfx) playCoinSound(sfx);
          }
        }
      }
      pillarsRef.current = pillarsRef.current.filter((p) => p.x + PILLAR_WIDTH > -10);
    }

    // Vaivém usa uma hitbox 2-3px menor nas laterais (pedido explícito, só
    // pra esse modo) — os outros passam inset 0 (comportamento inalterado).
    const hitPillar = checkCollision(bird, pillarsRef.current, width, height, mode === "oscilante" ? OSC_COLLISION_INSET : 0);
    const hitChaosEnemy = mode === "caotico" && checkChaosCollision(bird, chaosEnemiesRef.current, birdX);
    if (hitPillar || hitChaosEnemy) {
      triggerCollisionEnd();
    }
  }

  function drawBird(ctx: CanvasRenderingContext2D, bird: Bird, width: number) {
    const x = width * BIRD_X_RATIO;
    // drawBird só é chamado de dentro do loop imperativo do canvas (rAF),
    // nunca durante o render do React — performance.now() aqui é seguro,
    // apesar do linter não conseguir provar isso estaticamente.
    // eslint-disable-next-line react-hooks/purity
    const flap = Math.sin(performance.now() / 90); // -1..1, ciclo do bater de asa
    // Skins usam cor fixa, mas o "Clássico" guarda a var(--color-accent) do
    // tema — canvas não entende CSS var, então resolve pro valor já lido
    // via getComputedStyle (colorsRef) nesse caso específico.
    const skin = skinRef.current;
    const bodyColor = skin.corpo.startsWith("var(") ? colorsRef.current.accent : skin.corpo;
    const bodyColorStrong = skin.corpoForte.startsWith("var(") ? colorsRef.current.accentStrong : skin.corpoForte;
    ctx.save();
    ctx.translate(x, bird.y);
    ctx.rotate(bird.rotation);

    // Asa: um Path2D (curvas no estilo de um path SVG) girando num pivô nas
    // costas do corpo — fica atrás do corpo de propósito, só a base "gruda".
    const wingPath = wingPathRef.current;
    if (wingPath) {
      ctx.save();
      ctx.translate(-4, -2);
      ctx.rotate(-0.5 + flap * 0.6);
      ctx.scale(1, 0.85 + Math.abs(flap) * 0.15);
      ctx.fillStyle = bodyColorStrong;
      ctx.fill(wingPath);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke(wingPath);
      ctx.restore();
    }

    // Corpo: gradiente radial (dá volume de "moeda") + sombra suave.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    const bodyGradient = ctx.createRadialGradient(-5, -6, 2, 0, 0, BIRD_RADIUS + 2);
    bodyGradient.addColorStop(0, bodyColor);
    bodyGradient.addColorStop(1, bodyColorStrong);
    ctx.beginPath();
    ctx.fillStyle = bodyGradient;
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bico, olhinho e "$" no peito — de frente, sem sombra.
    ctx.beginPath();
    ctx.moveTo(BIRD_RADIUS - 3, -2);
    ctx.lineTo(BIRD_RADIUS + 7, 2);
    ctx.lineTo(BIRD_RADIUS - 3, 6);
    ctx.closePath();
    ctx.fillStyle = GOLD_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(BIRD_RADIUS * 0.35, -BIRD_RADIUS * 0.35, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(BIRD_RADIUS * 0.35 + 1.2, -BIRD_RADIUS * 0.35, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "#1f2937";
    ctx.fill();

    drawBirdAccessory(ctx, skin.acessorio);

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", -2, 6);

    ctx.restore();
  }

  /** Mesmos acessórios do BirdIcon (SVG), redesenhados em canvas com as mesmas coordenadas. */
  function drawBirdAccessory(ctx: CanvasRenderingContext2D, acessorio: BirdAccessory | undefined) {
    if (acessorio === "oculos") {
      drawRoundedRect(ctx, -0.5, -9, 11, 7, 3);
      ctx.fillStyle = "rgba(17,24,39,0.94)";
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-0.5, -6);
      ctx.lineTo(-7, -7.5);
      ctx.stroke();
    } else if (acessorio === "tapaOlho") {
      ctx.beginPath();
      ctx.ellipse(5.25, -5.25, 5, 5.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#111827";
      ctx.fill();
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-8, -10.5);
      ctx.lineTo(10, -1.5);
      ctx.stroke();
    } else if (acessorio === "coroa") {
      ctx.beginPath();
      ctx.moveTo(-4, -15);
      ctx.lineTo(-4, -21);
      ctx.lineTo(-1, -17);
      ctx.lineTo(2, -23);
      ctx.lineTo(5, -17);
      ctx.lineTo(8, -21);
      ctx.lineTo(8, -15);
      ctx.closePath();
      ctx.fillStyle = GOLD_COLOR;
      ctx.fill();
      ctx.strokeStyle = GOLD_COLOR_DARK;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    } else if (acessorio === "gravata") {
      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      ctx.moveTo(-4, 10);
      ctx.lineTo(4, 10);
      ctx.lineTo(0, 13);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-1.3, 13);
      ctx.lineTo(1.3, 13);
      ctx.lineTo(1.3, 20);
      ctx.lineTo(-1.3, 20);
      ctx.closePath();
      ctx.fill();
    }
  }

  /**
   * Pilastra desenhada com os assets de public/game/: a textura de notas
   * (pilastra-corpo-tile.svg) ladrilhada verticalmente pro corpo, e a tampa
   * de moedas (pilastra-topo-moedas.svg) na ponta que encosta no vão —
   * virada de cabeça pra baixo quando é a pilastra de cima (o lado aberto
   * sempre "olha" pro vão). Enquanto as imagens não carregam, cai pro
   * design antigo (drawStackFallback) pra nunca ficar em branco.
   */
  function drawPillarSegment(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    capSide: "top" | "bottom",
  ) {
    if (h <= 0) return;
    const bodyImg = bodyTileImgRef.current;
    const capImg = capImgRef.current;
    if (!bodyImg?.complete || !capImg?.complete || bodyImg.naturalWidth === 0 || capImg.naturalWidth === 0) {
      drawStackFallback(ctx, x, y, w, h);
      return;
    }

    const capH = Math.min((CAP_NATIVE_H * w) / CAP_NATIVE_W, h);
    const bodyH = h - capH;
    const bodyY = capSide === "bottom" ? y : y + capH;
    const tileH = (BODY_TILE_NATIVE_H * w) / BODY_TILE_NATIVE_W;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    if (bodyH > 0) {
      for (let ty = 0; ty < bodyH; ty += tileH) {
        ctx.drawImage(bodyImg, x, bodyY + ty, w, tileH);
      }
    }

    if (capSide === "bottom") {
      ctx.save();
      ctx.translate(x + w / 2, y + h - capH / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(capImg, -w / 2, -capH / 2, w, capH);
      ctx.restore();
    } else {
      ctx.drawImage(capImg, x, y, w, capH);
    }

    ctx.restore();
  }

  /**
   * Inimigo do modo Caos: o SVG desenhado DIRETO no canvas, sem cartão/fundo/
   * borda por trás — os próprios SVGs já têm fundo transparente e contorno
   * próprio. Tamanho nativo (~80-104px), escalado só pela altura do canvas
   * (canvasScale = altura/860) e pela escala própria do inimigo (só "juros"
   * muda isso, crescendo com o tempo). Sombra suave desenhada pelo canvas a
   * partir do alfa da própria imagem — nada de sombra retangular.
   */
  function drawChaosEnemy(
    ctx: CanvasRenderingContext2D,
    enemy: ChaosEnemy,
    img: HTMLImageElement | undefined,
    canvasScale: number,
  ) {
    if (!img?.complete || img.naturalWidth === 0) return;
    const w = img.naturalWidth * canvasScale * enemy.scale;
    const h = img.naturalHeight * canvasScale * enemy.scale;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.rotation);
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  /** Rastro de velocidade: 2-3 linhas curtas semitransparentes atrás (à
   * direita, já que os inimigos andam pra esquerda) do inimigo. */
  function drawChaosTrail(
    ctx: CanvasRenderingContext2D,
    enemy: ChaosEnemy,
    img: HTMLImageElement | undefined,
    canvasScale: number,
  ) {
    const w = (img?.naturalWidth || 90) * canvasScale * enemy.scale;
    ctx.save();
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const offset = w / 2 + 6 + i * 9;
      ctx.strokeStyle = `rgba(255,255,255,${Math.max(0.28 - i * 0.08, 0.05)})`;
      ctx.beginPath();
      ctx.moveTo(enemy.x + offset, enemy.y - 3 + i * 3);
      ctx.lineTo(enemy.x + offset + 12, enemy.y - 3 + i * 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Aviso piscando (⚠️) na borda direita, na altura em que um inimigo
   * pendente vai entrar em cena — dá ~0.6s pro jogador reagir. */
  function drawChaosWarning(ctx: CanvasRenderingContext2D, width: number, y: number) {
    ctx.save();
    ctx.font = "22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚠️", width - 22, y);
    ctx.restore();
  }

  /** Design anterior (gradiente + linhas + faixa dourada) — só usado como fallback enquanto os SVGs de public/game/ carregam. */
  function drawStackFallback(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    if (h <= 0) return;
    const radius = 10;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, colorsRef.current.accent);
    gradient.addColorStop(1, colorsRef.current.accentStrong);
    drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.clip();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    for (let by = y + BILL_LINE_SPACING; by < y + h; by += BILL_LINE_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + w, by);
      ctx.stroke();
    }
    ctx.restore();

    if (h > CASH_BAND_HEIGHT + 6) {
      const bandY = y + h / 2 - CASH_BAND_HEIGHT / 2;
      ctx.fillStyle = GOLD_COLOR;
      ctx.fillRect(x, bandY, w, CASH_BAND_HEIGHT);
      ctx.strokeStyle = GOLD_COLOR_DARK;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, bandY + 0.5, w - 1, CASH_BAND_HEIGHT - 1);
      ctx.fillStyle = "#7a5410";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", x + w / 2, bandY + CASH_BAND_HEIGHT / 2 + 1);
    }

    ctx.strokeStyle = colorsRef.current.border;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, w, h, radius);
    ctx.stroke();
  }

  function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, phase: number) {
    const bob = Math.sin(performance.now() / 220 + phase) * 3;
    const cy = y + bob;
    ctx.beginPath();
    ctx.arc(x, cy, COIN_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = GOLD_COLOR;
    ctx.fill();
    ctx.strokeStyle = GOLD_COLOR_DARK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", x, cy + 0.5);
  }

  /** Uma camada de fundo, escalada pra cobrir a altura do canvas e ladrilhada na horizontal conforme rola. Retorna false se a imagem ainda não carregou. */
  function drawParallaxLayer(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    speedFactor: number,
    canvasW: number,
    canvasH: number,
  ): boolean {
    if (!img.complete || img.naturalWidth === 0) return false;
    const scale = canvasH / SCENE_NATIVE_H;
    const drawW = SCENE_NATIVE_W * scale;
    const offset = (backgroundScrollRef.current * speedFactor) % drawW;
    for (let x = -offset; x < canvasW; x += drawW) {
      ctx.drawImage(img, x, 0, drawW, canvasH);
    }
    return true;
  }

  function draw(ctx: CanvasRenderingContext2D) {
    const { width, height } = sizeRef.current;

    // Screen shake: tremor rápido (~200ms) entre a colisão e o game over de
    // fato (ver triggerCollisionEnd) — desloca a cena inteira, não move nada
    // de verdade (freezeRef já travou a física nesse meio-tempo).
    let shakeX = 0;
    let shakeY = 0;
    const shake = screenShakeRef.current;
    if (shake.active) {
      const elapsed = performance.now() - shake.startTime;
      if (elapsed < CHAOS_SHAKE_DURATION_MS) {
        const damp = 1 - elapsed / CHAOS_SHAKE_DURATION_MS;
        shakeX = (Math.random() * 2 - 1) * CHAOS_SHAKE_MAGNITUDE * damp;
        shakeY = (Math.random() * 2 - 1) * CHAOS_SHAKE_MAGNITUDE * damp;
      } else {
        shake.active = false;
      }
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Fundo sólido primeiro (cobre qualquer folga caso a arte não preencha a
    // largura toda), depois o céu FIXO (não ladrilha, não rola — ver SKY_SRC)
    // e por cima as camadas que realmente rolam em paralaxe.
    ctx.fillStyle = colorsRef.current.bg;
    ctx.fillRect(0, 0, width, height);

    const skyImg = skyImgRef.current;
    if (skyImg?.complete && skyImg.naturalWidth > 0) {
      const skyScale = height / SCENE_NATIVE_H;
      const skyDrawW = SCENE_NATIVE_W * skyScale;
      const skyX = width - skyDrawW - SKY_RIGHT_MARGIN;
      ctx.drawImage(skyImg, skyX, 0, skyDrawW, height);
    }

    PARALLAX_LAYERS.forEach((layer, i) => {
      const img = parallaxImgsRef.current[i];
      if (img) drawParallaxLayer(ctx, img, layer.speedFactor, width, height);
    });

    const groundY = height - GROUND_HEIGHT;
    const mode = gameModeRef.current;

    // Ordem de camadas (pedido explícito, vale pro jogo todo): fundo →
    // [linha do gráfico, só Vaivém] → moedas/inimigos/pilastras → pássaro →
    // chão → HUD (placar/ticker são DOM, ficam por cima naturalmente).
    if (mode === "caotico") {
      for (const coin of chaosCoinsRef.current) {
        if (!coin.collected) drawCoin(ctx, coin.x, coin.y, coin.phase);
      }
      const canvasScale = height / SCENE_NATIVE_H;
      for (const enemy of chaosEnemiesRef.current) {
        const img = chaosImgsRef.current[enemy.type];
        drawChaosTrail(ctx, enemy, img, canvasScale);
        drawChaosEnemy(ctx, enemy, img, canvasScale);
      }
      const blink = Math.floor(performance.now() / 150) % 2 === 0;
      if (blink) {
        for (const pending of chaosPendingRef.current) {
          drawChaosWarning(ctx, width, pending.y);
        }
      }
    } else {
      if (mode === "oscilante") drawOscChartLine(ctx, pillarsRef.current);
      for (const p of pillarsRef.current) {
        if (p.gapY !== undefined) {
          const gapTop = p.gapY - PILLAR_GAP / 2;
          const gapBottom = p.gapY + PILLAR_GAP / 2;
          drawPillarSegment(ctx, p.x, 0, PILLAR_WIDTH, gapTop, "bottom");
          drawPillarSegment(ctx, p.x, gapBottom, PILLAR_WIDTH, groundY - gapBottom, "top");
          if (!p.coinCollected) drawCoin(ctx, p.x + PILLAR_WIDTH / 2, p.gapY, p.coinPhase);
          if (mode === "oscilante") {
            const direction = getOscDirection(p);
            if (direction) {
              const arrowX = p.x + PILLAR_WIDTH / 2;
              drawOscArrow(ctx, arrowX, gapBottom - OSC_ARROW_OFFSET, direction.up, direction.alpha);
              drawOscArrow(ctx, arrowX, gapTop + OSC_ARROW_OFFSET, direction.up, direction.alpha);
            }
          }
        }
      }
      if (mode === "oscilante") drawOscEventWarning(ctx, width, height);
    }

    drawBird(ctx, birdRef.current, width);

    // Chão por último (antes só do HUD, que é DOM) — cobre a base das
    // pilastras/pássaro, exatamente a ordem pedida.
    const groundImg = groundTextureImgRef.current;
    if (groundImg?.complete && groundImg.naturalWidth > 0) {
      const groundScale = GROUND_HEIGHT / GROUND_TEXTURE_NATIVE_H;
      const drawW = GROUND_TEXTURE_NATIVE_W * groundScale;
      const offset = backgroundScrollRef.current % drawW; // mesma velocidade do mundo — é o piso das pilastras
      for (let x = -offset; x < width; x += drawW) {
        ctx.drawImage(groundImg, x, groundY, drawW, GROUND_HEIGHT);
      }
    } else {
      ctx.fillStyle = colorsRef.current.border;
      ctx.fillRect(0, groundY, width, GROUND_HEIGHT);
    }

    ctx.restore();
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;

    // Path2D é uma API de navegador (não existe durante o SSR) — por isso é
    // criado aqui dentro do efeito (só roda no cliente), uma vez só, e
    // reaproveitado a cada frame em vez de reconstruído a partir da string.
    wingPathRef.current = new Path2D("M0,0 C-4,-11 -17,-12 -22,-2 C-16,3 -7,4 0,0 Z");

    function resize() {
      if (!canvas || !parent) return;
      const width = Math.min(parent.clientWidth, 480);
      const height = parent.clientHeight;
      sizeRef.current = { width, height };
      setCanvasSize({ width, height });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (gameStateRef.current === "idle") {
        birdRef.current.y = height / 2;
      }
    }
    resize();
    window.addEventListener("resize", resize);

    // Só reage a toque durante o jogo — "idle" e "gameover" agora têm seus
    // próprios botões (menu/game over), então tocar fora deles não faz nada.
    function handleFlap(event: Event) {
      if (gameStateRef.current !== "playing") return;
      event.preventDefault();
      birdRef.current.vy = FLAP_VELOCITY;
    }
    canvas.addEventListener("pointerdown", handleFlap);

    function handleKey(event: KeyboardEvent) {
      if (event.code === "Space") handleFlap(event);
    }
    window.addEventListener("keydown", handleKey);

    let rafId: number;
    let lastTime: number | null = null;
    function step(time: number) {
      if (lastTime === null) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 1 / 30);
      lastTime = time;
      if (gameStateRef.current === "playing") updateSpeedMultiplier(dt);
      // O fundo rola sempre (até no menu, bem devagar) — só acelera pra
      // valer, junto com as pilastras, durante o jogo de verdade. Usa o
      // multiplicador SUAVIZADO (não getSpeedMultiplier direto) pra não dar
      // um salto visível toda vez que a pontuação bate um múltiplo de 5.
      const worldSpeed =
        gameStateRef.current === "playing"
          ? BASE_PILLAR_SPEED * currentSpeedMultiplierRef.current
          : BASE_PILLAR_SPEED * 0.3;
      backgroundScrollRef.current += worldSpeed * dt;
      update(dt);
      if (ctx) draw(ctx);
      rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", handleKey);
      canvas.removeEventListener("pointerdown", handleFlap);
    };
    // update/draw/startGame só tocam refs (+ submitRunRef/bestByModeRef,
    // sempre atualizados), então a closure capturada no mount nunca fica desatualizada
    // — roda uma vez só de propósito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden rounded-2xl bg-bg">
      <canvas ref={canvasRef} className="block touch-none" />

      <div className="pointer-events-none absolute inset-x-0 top-3 grid grid-cols-[1fr_auto_1fr] items-start px-4">
        <div className="flex justify-start">
          <AnimatePresence>
            {gameState === "playing" && coins > 0 && (
              <motion.p
                key={`coins-${coins}`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                className="flex items-center gap-1 text-sm font-semibold text-ink"
              >
                🪙 {coins}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center">
          <AnimatePresence mode="popLayout">
            {gameState === "playing" && (
              <motion.p
                key={score}
                initial={{ opacity: 0, y: -8, scale: 1.3 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`text-3xl font-bold transition-colors duration-300 ${
                  isNewRecord ? "text-accent-strong" : "text-ink"
                }`}
                style={isNewRecord ? { filter: "drop-shadow(0 0 8px var(--color-accent))" } : undefined}
              >
                {score}
              </motion.p>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {gameState === "playing" && showRecordBadge && (
              <motion.p
                key="record-badge"
                initial={{ opacity: 0, y: -4, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                className="text-[11px] font-semibold text-accent-strong"
              >
                🏆 Novo recorde!
              </motion.p>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {gameState === "playing" && speedMultiplier > 1 && (
              <motion.p
                key={`speed-${speedMultiplier}`}
                initial={{ opacity: 0, scale: 0.6, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", bounce: 0.5, duration: 0.4 }}
                className="flex items-center gap-0.5 text-xs font-semibold text-accent-strong"
              >
                <Zap size={12} className="fill-accent-strong" />
                {speedMultiplier.toFixed(1)}x
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Ativar som" : "Silenciar"}
            className="pointer-events-auto text-ink-muted transition-transform active:scale-90"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {gameState === "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            // Saída quase instantânea de propósito: quando isso desmonta, o
            // passarinho já chegou no tamanho/posição exatos do jogo real —
            // uma saída lenta aqui deixava os dois visíveis ao mesmo tempo
            // por um instante (o "sobreposto" que ficava estranho).
            exit={{ opacity: 0, transition: { duration: 0.05 } }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 overflow-hidden"
          >
            {/* Fundo sólido do menu — some só perto do fim do voo (não assim
                que ele começa), senão o mundo ficava visível com o
                passarinho ainda grande no meio do caminho, um "passarinho
                gigante sobre a cidade em miniatura" estranho. */}
            <motion.div
              className="absolute inset-0 bg-bg"
              animate={{ opacity: transitioning ? 0 : 1 }}
              transition={{ duration: 0.3, delay: transitioning ? Math.max(FLIGHT_DURATION_S - 0.3, 0) : 0 }}
            />

            <div className="relative flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
              {/* O halo (círculo de fundo) fica no lugar e só esmaece — só o
                  passarinho em si (elemento separado, sem fundo) é que voa.
                  Antes os dois estavam no mesmo elemento e o círculo "ia
                  junto" na animação, o que ficava estranho. */}
              <div className="relative flex size-16 items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full bg-accent-soft"
                  animate={{ opacity: transitioning ? 0 : 1 }}
                  transition={{ duration: 0.2 }}
                />
                {/* O passarinho é UM elemento só do início ao fim (nunca troca
                    de instância nem de posição/ref) — voa via transform
                    (x/y/scale) a partir de onde ele JÁ está de verdade,
                    medido no clique de "Jogar" (handlePlayClick). O resto do
                    menu (abaixo) tem sua própria opacidade, então esmaecer o
                    texto não esmaece o passarinho junto. */}
                <motion.div ref={birdIconRef} animate={birdControls} className="relative">
                  <motion.div
                    animate={transitioning ? { y: 0 } : { y: [0, -6, 0] }}
                    transition={{ duration: 2, repeat: transitioning ? 0 : Infinity, ease: "easeInOut" }}
                  >
                    <BirdIcon
                      size={40}
                      corpo={equippedSkin.corpo}
                      corpoForte={equippedSkin.corpoForte}
                      acessorio={equippedSkin.acessorio}
                    />
                  </motion.div>
                </motion.div>
              </div>

              <motion.div
                animate={{ opacity: transitioning ? 0 : 1 }}
                transition={{ duration: 0.15 }}
                className={`flex flex-col items-center gap-5 ${transitioning ? "pointer-events-none" : ""}`}
              >
                <div>
                  <p className="mt-2 text-2xl font-bold text-ink">Cifrão Voador</p>
                  <p className="max-w-55 text-sm text-ink-muted">
                    Desvie das pilastras de dinheiro e pegue moedas pelo caminho
                  </p>
                </div>

                <div className="flex items-stretch gap-4 rounded-2xl bg-surface px-5 py-3 shadow-card">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-lg font-bold text-ink">{bestByMode[selectedMode] ?? 0}</span>
                    <span className="text-[11px] text-ink-muted">🏆 recorde</span>
                  </div>
                  <div className="w-px bg-border" />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-lg font-bold text-ink">{myCoins}</span>
                    <span className="text-[11px] text-ink-muted">🪙 moedas</span>
                  </div>
                </div>

                {ownedModes.length > 1 && (
                  <div className="flex w-full max-w-57.5 flex-wrap justify-center gap-1.5">
                    {ownedModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedMode === mode.id
                            ? "border-accent bg-accent-soft text-accent-strong"
                            : "border-border text-ink-muted"
                        }`}
                      >
                        {mode.nome}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex w-full max-w-57.5 flex-col gap-2">
                  <button
                    onClick={handlePlayClick}
                    className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-transform active:scale-95 hover:bg-accent-strong"
                  >
                    Jogar
                  </button>
                  <button
                    onClick={() => setShopOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-border px-6 py-2.5 text-sm font-medium text-ink-muted transition-transform active:scale-95 hover:bg-bg"
                  >
                    <Store size={16} />
                    Loja
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {gameState === "gameover" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 px-6 text-center backdrop-blur-sm"
          >
            {selectedMode === "oscilante" ? (
              <>
                <p className="flex items-center gap-2 text-xl font-bold text-white">
                  Sua ação fechou em {score} pontos
                  <span style={{ color: isNewRecord ? OSC_UP_COLOR : OSC_DOWN_COLOR }}>
                    {isNewRecord ? "▲" : "▼"}
                  </span>
                </p>
                {oscChartSnapshot.length >= 2 &&
                  (() => {
                    const w = 200;
                    const h = 50;
                    const min = Math.min(...oscChartSnapshot);
                    const max = Math.max(...oscChartSnapshot);
                    const range = Math.max(max - min, 1);
                    const points = oscChartSnapshot
                      .map((v, i) => {
                        const x = (i / (oscChartSnapshot.length - 1)) * w;
                        const y = ((v - min) / range) * (h - 6) + 3;
                        return `${x},${y}`;
                      })
                      .join(" ");
                    const closedUp = oscChartSnapshot[oscChartSnapshot.length - 1] < oscChartSnapshot[0];
                    return (
                      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="my-1">
                        <polyline
                          points={points}
                          fill="none"
                          stroke={closedUp ? OSC_UP_COLOR : OSC_DOWN_COLOR}
                          strokeWidth={2}
                        />
                      </svg>
                    );
                  })()}
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-white">Pontuação: {score}</p>
                <p className="text-sm text-white/80">
                  Seu recorde ({getGameMode(selectedMode).nome}): {Math.max(bestByMode[selectedMode] ?? 0, score)}
                </p>
              </>
            )}
            {coins > 0 && (
              <p className="text-sm text-white/80">
                🪙 {coins} nessa partida · {totalCoinsAtGameOver ?? myCoins + coins} no total
              </p>
            )}
            <div className="mt-2 flex w-full max-w-57.5 flex-col gap-2">
              <button
                onClick={startGame}
                className="rounded-2xl bg-accent px-6 py-2.5 text-sm font-medium text-white transition-transform active:scale-95 hover:bg-accent-strong"
              >
                Jogar de novo
              </button>
              <button
                onClick={goToMenu}
                className="rounded-2xl border border-white/30 px-6 py-2.5 text-sm font-medium text-white transition-transform active:scale-95 hover:bg-white/10"
              >
                Menu
              </button>
              <button onClick={onExit} className="text-sm text-white/70 hover:underline">
                Sair
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Shop open={shopOpen} onClose={() => setShopOpen(false)} />
    </div>
  );
}
