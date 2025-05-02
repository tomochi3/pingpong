// ゲームの設定
const GAME_CONFIG = {
    width: 800,
    height: 500,
    paddleWidth: 15,
    paddleHeight: 100,
    ballRadius: 10,
    initialBallSpeed: 5,
    maxBallSpeed: 15,
    paddleSpeed: 5,
    paddleAcceleration: 0.5,     // 加速度を強化
    maxPaddleSpeed: 20,          // 最大速度を上げる
    paddleDeceleration: 0.05,    // 減速を緩やかに
    spinFactor: 0.2,             // 回転の影響を強化
    spinDecay: 0.998,            // 回転の減衰を緩やかに
    spinEffectOnCurve: 0.15,     // 曲がりの効果を強化
    spinEffectOnBounce: 1.5,     // 壁での反射への影響を強化
    scoreToWin: 5,
    debugMode: false,            // デバッグモード
    twoPlayerMode: true,         // 2人プレイモード
    soundEnabled: true           // 音声効果の有効化
};

// ゲームの状態
const GAME_STATE = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over'
};

// ゲームクラス
class TennisGame {
    constructor() {
        try {
            // キャンバスの設定
            this.canvas = document.getElementById('gameCanvas');
            if (!this.canvas) {
                console.error('キャンバス要素が見つかりません');
                return;
            }
            
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = GAME_CONFIG.width;
            this.canvas.height = GAME_CONFIG.height;
            
            // ゲーム状態の初期化
            this.state = GAME_STATE.MENU;
            this.playerScore = 0;
            this.cpuScore = 0;
            this.lastTime = 0;
            this.keysPressed = {};
            this.keyHoldTime = {
                'w': 0,
                's': 0,
                'o': 0,
                'l': 0
            };
            
            // サウンドの読み込み
            this.loadSounds();
            
            console.log('ゲームが正常に初期化されました');
        } catch (error) {
            console.error('ゲームの初期化中にエラーが発生しました:', error);
        }
    }
    
    // サウンドの読み込み
    loadSounds() {
        if (!GAME_CONFIG.soundEnabled) return;
        
        try {
            this.sounds = {
                hit: new Audio('sounds/hit.mp3'),
                spinLight: new Audio('sounds/spin_light.mp3'),
                spinMedium: new Audio('sounds/spin_medium.mp3'),
                spinHeavy: new Audio('sounds/spin_heavy.mp3'),
                gameStart: new Audio('sounds/game_start.mp3')
            };
            
            // 音量の設定
            this.sounds.hit.volume = 0.5;
            this.sounds.spinLight.volume = 0.3;
            this.sounds.spinMedium.volume = 0.4;
            this.sounds.spinHeavy.volume = 0.5;
            this.sounds.gameStart.volume = 0.6;
        } catch (e) {
            console.error('音声ファイルの読み込みに失敗しました:', e);
            GAME_CONFIG.soundEnabled = false;
        }
        
        // ゲームオブジェクトの初期化
        this.initializeGameObjects();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // スコアボードの参照
        this.playerScoreElement = document.querySelector('.player-score');
        this.cpuScoreElement = document.querySelector('.cpu-score');
        
        // ゲームループの開始
        this.gameLoop = this.gameLoop.bind(this);
        requestAnimationFrame(this.gameLoop);
    }
    
    // ゲームオブジェクトの初期化
    initializeGameObjects() {
        // プレイヤーのパドル
        this.playerPaddle = {
            x: 50,
            y: GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2,
            width: GAME_CONFIG.paddleWidth,
            height: GAME_CONFIG.paddleHeight,
            speed: 0,
            color: 'rgba(0, 243, 255, 0.8)'
        };
        
        // CPUのパドル
        this.cpuPaddle = {
            x: GAME_CONFIG.width - 50 - GAME_CONFIG.paddleWidth,
            y: GAME_CONFIG.height / 2 - GAME_CONFIG.paddleHeight / 2,
            width: GAME_CONFIG.paddleWidth,
            height: GAME_CONFIG.paddleHeight,
            speed: 0,
            color: 'rgba(255, 0, 230, 0.8)'
        };
        
        // ボール
        this.resetBall();
    }
    
    // ボールのリセット
    resetBall() {
        const direction = Math.random() > 0.5 ? 1 : -1;
        const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // -22.5度から22.5度
        
        this.ball = {
            x: GAME_CONFIG.width / 2,
            y: GAME_CONFIG.height / 2,
            radius: GAME_CONFIG.ballRadius,
            speedX: GAME_CONFIG.initialBallSpeed * Math.cos(angle) * direction,
            speedY: GAME_CONFIG.initialBallSpeed * Math.sin(angle),
            spin: 0, // 回転（スピン）の値
            color: 'rgba(255, 204, 0, 0.9)'
        };
    }
    
    // イベントリスナーの設定
    setupEventListeners() {
        // キー入力の検出
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = true;
            
            // スペースキーでゲーム開始
            if (key === ' ' && (this.state === GAME_STATE.MENU || this.state === GAME_STATE.GAME_OVER)) {
                this.startGame();
                if (GAME_CONFIG.soundEnabled) {
                    this.sounds.gameStart.play();
                }
            }
        });
        
        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = false;
            
            // キーホールド時間のリセット
            if (key === 'w' || key === 's' || key === 'o' || key === 'l') {
                this.keyHoldTime[key] = 0;
            }
        });
        
        // ボタンのイベント
        document.getElementById('startButton').addEventListener('click', () => {
            if (this.state === GAME_STATE.MENU || this.state === GAME_STATE.GAME_OVER) {
                this.startGame();
                if (GAME_CONFIG.soundEnabled) {
                    this.sounds.gameStart.play();
                }
            } else if (this.state === GAME_STATE.PAUSED) {
                this.state = GAME_STATE.PLAYING;
            }
        });
        
        document.getElementById('resetButton').addEventListener('click', () => {
            this.resetGame();
        });
    }
    
    // ゲームの開始
    startGame() {
        this.state = GAME_STATE.PLAYING;
        this.playerScore = 0;
        this.cpuScore = 0;
        this.updateScoreDisplay();
        this.initializeGameObjects();
    }
    
    // ゲームのリセット
    resetGame() {
        this.state = GAME_STATE.MENU;
        this.playerScore = 0;
        this.cpuScore = 0;
        this.updateScoreDisplay();
        this.initializeGameObjects();
    }
    
    // スコア表示の更新
    updateScoreDisplay() {
        this.playerScoreElement.textContent = this.playerScore;
        this.cpuScoreElement.textContent = this.cpuScore;
    }
    
    // プレイヤーの入力処理
    handleInput(deltaTime) {
        // パドルの減速（摩擦）
        if (Math.abs(this.playerPaddle.speed) > 0) {
            this.playerPaddle.speed *= (1 - GAME_CONFIG.paddleDeceleration);
            if (Math.abs(this.playerPaddle.speed) < 0.1) {
                this.playerPaddle.speed = 0;
            }
        }
        
        // 上方向への移動
        if (this.keysPressed['w'] || this.keysPressed['arrowup']) {
            const key = this.keysPressed['w'] ? 'w' : 'ArrowUp';
            this.keyHoldTime[key] += deltaTime;
            
            // 長押しによる加速 - より強力な加速を実装
            const accelerationFactor = Math.min(this.keyHoldTime[key] / 500, 2); // 加速時間を短縮し、最大係数を増加
            const baseSpeed = -GAME_CONFIG.paddleSpeed;
            const acceleration = GAME_CONFIG.paddleAcceleration * accelerationFactor * 15; // 加速度を強化
            const targetSpeed = baseSpeed - acceleration;
            
            // 現在の速度から目標速度へより速く変化
            this.playerPaddle.speed += (targetSpeed - this.playerPaddle.speed) * 0.2; // 反応速度を上げる
            
            // 最大速度の制限
            if (this.playerPaddle.speed < -GAME_CONFIG.maxPaddleSpeed) {
                this.playerPaddle.speed = -GAME_CONFIG.maxPaddleSpeed;
            }
        }
        
        // 下方向への移動
        if (this.keysPressed['s'] || this.keysPressed['arrowdown']) {
            const key = this.keysPressed['s'] ? 's' : 'ArrowDown';
            this.keyHoldTime[key] += deltaTime;
            
            // 長押しによる加速 - より強力な加速を実装
            const accelerationFactor = Math.min(this.keyHoldTime[key] / 500, 2); // 加速時間を短縮し、最大係数を増加
            const baseSpeed = GAME_CONFIG.paddleSpeed;
            const acceleration = GAME_CONFIG.paddleAcceleration * accelerationFactor * 15; // 加速度を強化
            const targetSpeed = baseSpeed + acceleration;
            
            // 現在の速度から目標速度へより速く変化
            this.playerPaddle.speed += (targetSpeed - this.playerPaddle.speed) * 0.2; // 反応速度を上げる
            
            // 最大速度の制限
            if (this.playerPaddle.speed > GAME_CONFIG.maxPaddleSpeed) {
                this.playerPaddle.speed = GAME_CONFIG.maxPaddleSpeed;
            }
        }
        
        // パドルの位置更新
        this.playerPaddle.y += this.playerPaddle.speed;
        
        // 画面外に出ないように制限
        if (this.playerPaddle.y < 0) {
            this.playerPaddle.y = 0;
            this.playerPaddle.speed = 0;
        } else if (this.playerPaddle.y + this.playerPaddle.height > GAME_CONFIG.height) {
            this.playerPaddle.y = GAME_CONFIG.height - this.playerPaddle.height;
            this.playerPaddle.speed = 0;
        }
    }
    
    // CPUの動き
    updateCPU() {
        // ボールの予測位置の計算
        let targetY = this.ball.y;
        
        // ボールがCPU側に向かっている場合、予測を行う
        if (this.ball.speedX > 0) {
            // ボールがCPUのx位置に到達するまでの時間を計算
            const timeToReach = (this.cpuPaddle.x - this.ball.x) / this.ball.speedX;
            
            // 回転を考慮した予測位置
            const spinEffect = this.ball.spin * GAME_CONFIG.spinEffectOnCurve * timeToReach * timeToReach;
            targetY = this.ball.y + (this.ball.speedY * timeToReach) + spinEffect;
            
            // 壁での反射を考慮
            const bounces = Math.floor(targetY / GAME_CONFIG.height);
            if (bounces % 2 === 0) {
                targetY = targetY % GAME_CONFIG.height;
            } else {
                targetY = GAME_CONFIG.height - (targetY % GAME_CONFIG.height);
            }
        }
        
        // パドルの中心位置
        const paddleCenter = this.cpuPaddle.y + this.cpuPaddle.height / 2;
        
        // 目標位置との差
        const diff = targetY - paddleCenter;
        
        // AIの難易度に応じた動きの遅延
        const aiResponseFactor = GAME_CONFIG.aiDifficulty;
        
        // 目標位置に向かって移動
        if (Math.abs(diff) > 5) {
            this.cpuPaddle.speed = Math.sign(diff) * GAME_CONFIG.paddleSpeed * aiResponseFactor;
        } else {
            this.cpuPaddle.speed = 0;
        }
        
        // パドルの位置更新
        this.cpuPaddle.y += this.cpuPaddle.speed;
        
        // 画面外に出ないように制限
        if (this.cpuPaddle.y < 0) {
            this.cpuPaddle.y = 0;
            this.cpuPaddle.speed = 0;
        } else if (this.cpuPaddle.y + this.cpuPaddle.height > GAME_CONFIG.height) {
            this.cpuPaddle.y = GAME_CONFIG.height - this.cpuPaddle.height;
            this.cpuPaddle.speed = 0;
        }
    }
    
    // ボールの更新
    updateBall(deltaTime) {
        // 回転の減衰
        this.ball.spin *= GAME_CONFIG.spinDecay;
        
        // 回転による軌道の曲がり - X方向とY方向の両方に影響
        const spinCurveEffect = this.ball.spin * GAME_CONFIG.spinEffectOnCurve;
        this.ball.speedY += spinCurveEffect;
        
        // X方向にも微妙な影響を与える（回転方向に応じて加速/減速）
        if (Math.abs(this.ball.spin) > 0.1) {
            const xSpinEffect = Math.sign(this.ball.speedX) * Math.abs(this.ball.spin) * GAME_CONFIG.spinEffectOnCurve * 0.3;
            this.ball.speedX += xSpinEffect;
        }
        
        // ボールの位置更新
        this.ball.x += this.ball.speedX;
        this.ball.y += this.ball.speedY;
        
        // 上下の壁との衝突判定
        if (this.ball.y - this.ball.radius < 0 || this.ball.y + this.ball.radius > GAME_CONFIG.height) {
            // 回転の影響を反射角に適用 - より強い効果
            const spinEffect = this.ball.spin * GAME_CONFIG.spinEffectOnBounce;
            this.ball.speedY = -this.ball.speedY + spinEffect;
            
            // X方向の速度にも影響を与える（回転方向に応じて）
            const xSpinEffect = Math.sign(this.ball.spin) * Math.abs(this.ball.spin) * GAME_CONFIG.spinEffectOnBounce * 0.4;
            this.ball.speedX += xSpinEffect;
            
            // 壁に当たった位置の調整
            if (this.ball.y - this.ball.radius < 0) {
                this.ball.y = this.ball.radius;
            } else {
                this.ball.y = GAME_CONFIG.height - this.ball.radius;
            }
            
            // 回転の減衰 - 壁での摩擦
            this.ball.spin *= 0.7;
        }
        
        // プレイヤーのパドルとの衝突判定
        if (this.ball.speedX < 0 && 
            this.ball.x - this.ball.radius <= this.playerPaddle.x + this.playerPaddle.width &&
            this.ball.x + this.ball.radius >= this.playerPaddle.x &&
            this.ball.y + this.ball.radius >= this.playerPaddle.y &&
            this.ball.y - this.ball.radius <= this.playerPaddle.y + this.playerPaddle.height) {
            
            // 衝突位置に基づく反射角の計算
            const hitPosition = (this.ball.y - (this.playerPaddle.y + this.playerPaddle.height / 2)) / (this.playerPaddle.height / 2);
            const bounceAngle = hitPosition * (Math.PI / 4); // 最大45度
            
            // 速度の更新
            const speed = Math.sqrt(this.ball.speedX * this.ball.speedX + this.ball.speedY * this.ball.speedY);
            const newSpeed = Math.min(speed + 0.5, GAME_CONFIG.maxBallSpeed);
            
            this.ball.speedX = Math.cos(bounceAngle) * newSpeed;
            this.ball.speedY = Math.sin(bounceAngle) * newSpeed;
            
            // パドルの速度に基づく回転の付与 - より強い効果
            // パドルの速度の絶対値が大きいほど、より強い回転がかかる
            const paddleSpeedFactor = Math.abs(this.playerPaddle.speed) / GAME_CONFIG.maxPaddleSpeed;
            const spinAmount = this.playerPaddle.speed * GAME_CONFIG.spinFactor * (1 + paddleSpeedFactor * 2);
            this.ball.spin += spinAmount;
            
            // 音声効果の再生
            if (GAME_CONFIG.soundEnabled) {
                // 通常のヒット音
                this.sounds.hit.play();
                
                // 回転の強さに応じた音声効果
                const spinIntensity = Math.abs(this.ball.spin);
                if (spinIntensity > 2) {
                    this.sounds.spinHeavy.play();
                } else if (spinIntensity > 1) {
                    this.sounds.spinMedium.play();
                } else if (spinIntensity > 0.5) {
                    this.sounds.spinLight.play();
                }
            }
            
            // デバッグ情報
            if (GAME_CONFIG.debugMode) {
                console.log(`Player Paddle Hit: Speed=${this.playerPaddle.speed.toFixed(2)}, Spin=${this.ball.spin.toFixed(2)}`);
            }
            
            // 位置の調整
            this.ball.x = this.playerPaddle.x + this.playerPaddle.width + this.ball.radius;
        }
        
        // CPUのパドルとの衝突判定
        if (this.ball.speedX > 0 && 
            this.ball.x + this.ball.radius >= this.cpuPaddle.x &&
            this.ball.x - this.ball.radius <= this.cpuPaddle.x + this.cpuPaddle.width &&
            this.ball.y + this.ball.radius >= this.cpuPaddle.y &&
            this.ball.y - this.ball.radius <= this.cpuPaddle.y + this.cpuPaddle.height) {
            
            // 衝突位置に基づく反射角の計算
            const hitPosition = (this.ball.y - (this.cpuPaddle.y + this.cpuPaddle.height / 2)) / (this.cpuPaddle.height / 2);
            const bounceAngle = hitPosition * (Math.PI / 4); // 最大45度
            
            // 速度の更新
            const speed = Math.sqrt(this.ball.speedX * this.ball.speedX + this.ball.speedY * this.ball.speedY);
            const newSpeed = Math.min(speed + 0.5, GAME_CONFIG.maxBallSpeed);
            
            this.ball.speedX = -Math.cos(bounceAngle) * newSpeed;
            this.ball.speedY = Math.sin(bounceAngle) * newSpeed;
            
            // パドルの速度に基づく回転の付与 - より強い効果
            // パドルの速度の絶対値が大きいほど、より強い回転がかかる
            const paddleSpeedFactor = Math.abs(this.cpuPaddle.speed) / GAME_CONFIG.maxPaddleSpeed;
            const spinAmount = this.cpuPaddle.speed * GAME_CONFIG.spinFactor * (1 + paddleSpeedFactor * 2);
            this.ball.spin += spinAmount;
            
            // 音声効果の再生
            if (GAME_CONFIG.soundEnabled) {
                // 通常のヒット音
                this.sounds.hit.play();
                
                // 回転の強さに応じた音声効果
                const spinIntensity = Math.abs(this.ball.spin);
                if (spinIntensity > 2) {
                    this.sounds.spinHeavy.play();
                } else if (spinIntensity > 1) {
                    this.sounds.spinMedium.play();
                } else if (spinIntensity > 0.5) {
                    this.sounds.spinLight.play();
                }
            }
            
            // デバッグ情報
            if (GAME_CONFIG.debugMode) {
                console.log(`CPU Paddle Hit: Speed=${this.cpuPaddle.speed.toFixed(2)}, Spin=${this.ball.spin.toFixed(2)}`);
            }
            
            // 位置の調整
            this.ball.x = this.cpuPaddle.x - this.ball.radius;
        }
        
        // 左右の壁（得点）
        if (this.ball.x - this.ball.radius < 0) {
            // CPU得点
            this.cpuScore++;
            this.updateScoreDisplay();
            this.checkGameOver();
            this.resetBall();
        } else if (this.ball.x + this.ball.radius > GAME_CONFIG.width) {
            // プレイヤー得点
            this.playerScore++;
            this.updateScoreDisplay();
            this.checkGameOver();
            this.resetBall();
        }
    }
    
    // ゲーム終了チェック
    checkGameOver() {
        if (this.playerScore >= GAME_CONFIG.scoreToWin || this.cpuScore >= GAME_CONFIG.scoreToWin) {
            this.state = GAME_STATE.GAME_OVER;
        }
    }
    
    // 右プレイヤーの入力処理
    handlePlayer2Input(deltaTime) {
        // パドルの減速（摩擦）
        if (Math.abs(this.cpuPaddle.speed) > 0) {
            this.cpuPaddle.speed *= (1 - GAME_CONFIG.paddleDeceleration);
            if (Math.abs(this.cpuPaddle.speed) < 0.1) {
                this.cpuPaddle.speed = 0;
            }
        }
        
        // 上方向への移動 (Oキー)
        if (this.keysPressed['o']) {
            this.keyHoldTime['o'] += deltaTime;
            
            // 長押しによる加速
            const accelerationFactor = Math.min(this.keyHoldTime['o'] / 500, 2);
            const baseSpeed = -GAME_CONFIG.paddleSpeed;
            const acceleration = GAME_CONFIG.paddleAcceleration * accelerationFactor * 15;
            const targetSpeed = baseSpeed - acceleration;
            
            // 現在の速度から目標速度へ変化
            this.cpuPaddle.speed += (targetSpeed - this.cpuPaddle.speed) * 0.2;
            
            // 最大速度の制限
            if (this.cpuPaddle.speed < -GAME_CONFIG.maxPaddleSpeed) {
                this.cpuPaddle.speed = -GAME_CONFIG.maxPaddleSpeed;
            }
        }
        
        // 下方向への移動 (Lキー)
        if (this.keysPressed['l']) {
            this.keyHoldTime['l'] += deltaTime;
            
            // 長押しによる加速
            const accelerationFactor = Math.min(this.keyHoldTime['l'] / 500, 2);
            const baseSpeed = GAME_CONFIG.paddleSpeed;
            const acceleration = GAME_CONFIG.paddleAcceleration * accelerationFactor * 15;
            const targetSpeed = baseSpeed + acceleration;
            
            // 現在の速度から目標速度へ変化
            this.cpuPaddle.speed += (targetSpeed - this.cpuPaddle.speed) * 0.2;
            
            // 最大速度の制限
            if (this.cpuPaddle.speed > GAME_CONFIG.maxPaddleSpeed) {
                this.cpuPaddle.speed = GAME_CONFIG.maxPaddleSpeed;
            }
        }
        
        // パドルの位置更新
        this.cpuPaddle.y += this.cpuPaddle.speed;
        
        // 画面外に出ないように制限
        if (this.cpuPaddle.y < 0) {
            this.cpuPaddle.y = 0;
            this.cpuPaddle.speed = 0;
        } else if (this.cpuPaddle.y + this.cpuPaddle.height > GAME_CONFIG.height) {
            this.cpuPaddle.y = GAME_CONFIG.height - this.cpuPaddle.height;
            this.cpuPaddle.speed = 0;
        }
    }
    
    // ゲームの更新
    update(deltaTime) {
        if (this.state !== GAME_STATE.PLAYING) return;
        
        this.handleInput(deltaTime);
        
        // 2人プレイモードの場合は右プレイヤーの入力を処理、そうでなければCPUの動きを更新
        if (GAME_CONFIG.twoPlayerMode) {
            this.handlePlayer2Input(deltaTime);
        } else {
            this.updateCPU();
        }
        
        this.updateBall(deltaTime);
    }
    
    // ゲームの描画
    render() {
        // キャンバスのクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 背景のグリッド
        this.drawGrid();
        
        // 中央線
        this.ctx.beginPath();
        this.ctx.setLineDash([10, 15]);
        this.ctx.moveTo(GAME_CONFIG.width / 2, 0);
        this.ctx.lineTo(GAME_CONFIG.width / 2, GAME_CONFIG.height);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // プレイヤーのパドル
        this.drawPaddle(this.playerPaddle);
        
        // CPUのパドル
        this.drawPaddle(this.cpuPaddle);
        
        // ボール
        this.drawBall();
        
        // ゲーム状態に応じたオーバーレイ
        if (this.state === GAME_STATE.MENU) {
            this.drawMenuOverlay();
        } else if (this.state === GAME_STATE.GAME_OVER) {
            this.drawGameOverOverlay();
        }
    }
    
    // グリッドの描画
    drawGrid() {
        const gridSize = 40;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        // 縦線
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        // 横線
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    // パドルの描画
    drawPaddle(paddle) {
        // パドルの本体
        this.ctx.fillStyle = paddle.color;
        this.ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // パドルの速度に応じたエフェクト - より顕著に
        if (Math.abs(paddle.speed) > 1) {
            const speedFactor = Math.min(Math.abs(paddle.speed) / GAME_CONFIG.maxPaddleSpeed, 1);
            const trailLength = speedFactor * 30; // 軌跡を長く
            
            // 速度に応じて色を変化
            const alpha = 0.3 + speedFactor * 0.2;
            this.ctx.fillStyle = paddle.color.replace('0.8', alpha.toString());
            
            if (paddle.speed < 0) { // 上向きの動き
                this.ctx.fillRect(
                    paddle.x, 
                    paddle.y + paddle.height, 
                    paddle.width, 
                    trailLength
                );
            } else { // 下向きの動き
                this.ctx.fillRect(
                    paddle.x, 
                    paddle.y - trailLength, 
                    paddle.width, 
                    trailLength
                );
            }
            
            // 速度が非常に速い場合は二重の軌跡
            if (speedFactor > 0.7) {
                const secondTrailLength = speedFactor * 15;
                this.ctx.fillStyle = paddle.color.replace('0.8', '0.15');
                
                if (paddle.speed < 0) { // 上向きの動き
                    this.ctx.fillRect(
                        paddle.x, 
                        paddle.y + paddle.height + trailLength, 
                        paddle.width, 
                        secondTrailLength
                    );
                } else { // 下向きの動き
                    this.ctx.fillRect(
                        paddle.x, 
                        paddle.y - trailLength - secondTrailLength, 
                        paddle.width, 
                        secondTrailLength
                    );
                }
            }
        }
        
        // パドルの輪郭
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
    }
    
    // ボールの描画
    drawBall() {
        // ボールの本体
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        
        // 回転の強さに応じて色を変化させる
        const spinIntensity = Math.min(Math.abs(this.ball.spin) / 3, 1);
        let ballColor;
        
        if (this.ball.spin > 0) {
            // 正の回転（時計回り）は赤っぽく
            ballColor = `rgba(255, ${Math.floor(204 - spinIntensity * 100)}, ${Math.floor(0 + spinIntensity * 50)}, 0.9)`;
        } else if (this.ball.spin < 0) {
            // 負の回転（反時計回り）は青っぽく
            ballColor = `rgba(${Math.floor(255 - spinIntensity * 100)}, ${Math.floor(204 + spinIntensity * 50)}, 255, 0.9)`;
        } else {
            // 回転なしは通常色
            ballColor = this.ball.color;
        }
        
        this.ctx.fillStyle = ballColor;
        this.ctx.fill();
        
        // 回転の視覚化 - より明確に
        if (Math.abs(this.ball.spin) > 0.1) {
            const spinDirection = this.ball.spin > 0 ? 1 : -1;
            const spinIntensity = Math.min(Math.abs(this.ball.spin) / 2, 1);
            
            // 回転方向を示す矢印 - より大きく
            this.ctx.beginPath();
            this.ctx.arc(
                this.ball.x, 
                this.ball.y, 
                this.ball.radius * 0.7, 
                0, 
                spinDirection * spinIntensity * Math.PI * 1.8
            );
            
            // 回転の強さに応じて矢印の色を変える
            const arrowColor = spinDirection > 0 ? 
                `rgba(255, ${Math.floor(255 - spinIntensity * 150)}, ${Math.floor(255 - spinIntensity * 200)}, 0.8)` : 
                `rgba(${Math.floor(255 - spinIntensity * 150)}, ${Math.floor(255 - spinIntensity * 150)}, 255, 0.8)`;
            
            this.ctx.strokeStyle = arrowColor;
            this.ctx.lineWidth = 2 + spinIntensity * 2; // 回転が強いほど太い線
            this.ctx.stroke();
            
            // 矢印の先端
            const arrowX = this.ball.x + Math.cos(spinDirection * spinIntensity * Math.PI * 1.8) * this.ball.radius * 0.7;
            const arrowY = this.ball.y + Math.sin(spinDirection * spinIntensity * Math.PI * 1.8) * this.ball.radius * 0.7;
            
            this.ctx.beginPath();
            this.ctx.moveTo(arrowX, arrowY);
            this.ctx.lineTo(
                arrowX + Math.cos(spinDirection * spinIntensity * Math.PI * 1.8 + spinDirection * Math.PI / 6) * (5 + spinIntensity * 3),
                arrowY + Math.sin(spinDirection * spinIntensity * Math.PI * 1.8 + spinDirection * Math.PI / 6) * (5 + spinIntensity * 3)
            );
            this.ctx.lineTo(
                arrowX + Math.cos(spinDirection * spinIntensity * Math.PI * 1.8 - spinDirection * Math.PI / 6) * (5 + spinIntensity * 3),
                arrowY + Math.sin(spinDirection * spinIntensity * Math.PI * 1.8 - spinDirection * Math.PI / 6) * (5 + spinIntensity * 3)
            );
            this.ctx.closePath();
            this.ctx.fillStyle = arrowColor;
            this.ctx.fill();
        }
        
        // ボールの軌跡 - より長く、より明確に
        const speed = Math.sqrt(this.ball.speedX * this.ball.speedX + this.ball.speedY * this.ball.speedY);
        const speedFactor = Math.min(speed / GAME_CONFIG.maxBallSpeed, 1);
        
        if (speedFactor > 0.2) { // より低速でも軌跡を表示
            // 複数の軌跡ポイントを描画
            for (let i = 1; i <= 3; i++) {
                const trailFactor = i / 3;
                const trailAlpha = (1 - trailFactor) * speedFactor * 0.5;
                
                this.ctx.beginPath();
                this.ctx.moveTo(
                    this.ball.x - this.ball.speedX * trailFactor * 2,
                    this.ball.y - this.ball.speedY * trailFactor * 2
                );
                this.ctx.lineTo(
                    this.ball.x - this.ball.speedX * trailFactor * 4,
                    this.ball.y - this.ball.speedY * trailFactor * 4
                );
                this.ctx.strokeStyle = `rgba(255, 204, 0, ${trailAlpha})`;
                this.ctx.lineWidth = this.ball.radius * speedFactor * (1 - trailFactor * 0.5);
                this.ctx.stroke();
            }
        }
    }
    
    // メニューオーバーレイの描画
    drawMenuOverlay() {
        // 半透明の背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // タイトル
        this.ctx.fillStyle = 'rgba(255, 204, 0, 0.9)';
        this.ctx.font = '40px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('モダンレトロテニス', this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // 説明
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.fillText('「ゲーム開始」ボタンを押してください', this.canvas.width / 2, this.canvas.height / 2 + 30);
    }
    
    // ゲームオーバーオーバーレイの描画
    drawGameOverOverlay() {
        // 半透明の背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 結果
        this.ctx.fillStyle = 'rgba(255, 204, 0, 0.9)';
        this.ctx.font = '30px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        
        const winner = this.playerScore > this.cpuScore ? 'プレイヤー' : 'CPU';
        this.ctx.fillText(`${winner} の勝利!`, this.canvas.width / 2, this.canvas.height / 2 - 50);
        
        // スコア
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '20px "Press Start 2P"';
        this.ctx.fillText(`${this.playerScore} - ${this.cpuScore}`, this.canvas.width / 2, this.canvas.height / 2);
        
        // 説明
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.fillText('もう一度プレイするには「ゲーム開始」を押してください', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
    
    // ゲームループ
    gameLoop(currentTime) {
        // デルタタイムの計算
        const deltaTime = this.lastTime ? (currentTime - this.lastTime) : 0;
        this.lastTime = currentTime;
        
        // ゲームの更新
        this.update(deltaTime);
        
        // ゲームの描画
        this.render();
        
        // 次のフレームをリクエスト
        requestAnimationFrame(this.gameLoop);
    }
}

// DOMの読み込み完了時にゲームを初期化
document.addEventListener('DOMContentLoaded', () => {
    new TennisGame();
});
