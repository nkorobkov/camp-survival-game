let canvas = document.getElementById("game-canvas");
let ctx = canvas.getContext("2d");

const P_X = 20
const P_Y = 20

const E_X = 20
const E_Y = 20

const B_R = 3
const SPEED = 4.3
const BULLET_SPEED = 10
const ENEMY_SPEED = SPEED * 0.8
const SPAWN_TIMEOUT = 100
const MAX_TEMPERATURE = 100
const SHOOT_TIMEOUT = 50
const SPAWN_DENSITY_INCREASE_TIMEOUT = 10000
const TARGET_FPS = 60 // Target frames per second
const FRAME_TIME = 1000 / TARGET_FPS // Target time per frame in milliseconds

// Spawnable objects system
const SPAWNABLE_TYPES = {
    HEALTH_PACK: {
        id: 'health_pack',
        name: 'health',
        color: '#DA3232',
        size: 15,
        shape: 'square',
        spawnChance: 0.3, // 30% chance when spawning
        spawnInterval: 8000, // Spawn every 8 seconds
        lastSpawn: 0,
        maxOnField: 2
    },
    RAPID_FIRE: {
        id: 'rapid_fire',
        name: 'rapid fire',
        color: '#CD3BCD',
        size: 15,
        shape: 'square',
        spawnChance: 0.2, // 20% chance when spawning
        spawnInterval: 12000, // Spawn every 12 secondss
        lastSpawn: 0,
        maxOnField: 1,
        duration: 10000 // 10 seconds duration
    },
    SHOTGUN: {
        id: 'shotgun',
        name: 'shotgun',
        color: '#57BA50',
        size: 15,
        shape: 'square',
        spawnChance: 0.15, // 15% chance when spawning
        spawnInterval: 15000, // Spawn every 15 seconds
        lastSpawn: 0,
        maxOnField: 1,
        duration: 8000 // 8 seconds duration
    },
    INSTANT_KILL: {
        id: 'instant_kill',
        name: 'bomb',
        color: "#313939",
        size: 15,
        shape: 'circle',
        spawnChance: 0.1, // 10% chance when spawning
        spawnInterval: 20000, // Spawn every 20 seconds
        lastSpawn: 0,
        maxOnField: 1
    },
    SLOW_ENEMIES: {
        id: 'slow_enemies',
        name: 'slow',
        color: '#4169E1', // Royal blue
        size: 15,
        shape: 'circle',
        spawnChance: 0.25, // 25% chance when spawning
        spawnInterval: 15000, // Spawn every 15 seconds
        lastSpawn: 0,
        maxOnField: 1,
        duration: 5000 // 5 seconds duration
    },
    PERMANENT_BUFF: {
        id: 'permanent_buff',
        name: 'Permanent Buff',
        color: '#FFD700', // Yellow
        size: 18,
        shape: 'triangle',
        spawnChance: 0.1, 
        spawnInterval: 6000, 
        lastSpawn: 0,
        maxOnField: 1
    }
}

// Health system constants
const MAX_HEALTH = 5
const INVINCIBILITY_DURATION = 1000 // 1 second of invincibility after taking damage
const SCREEN_FLASH_DURATION = 200 // 200ms red flash

// Permanent buff system
let permanentBuffs = {
    shootingSpeed: 1, // Multiplier for shooting speed
    bulletSpread: 1, // Number of bullets with spread
        maxUpgradesOnField: {
        // Map of spawnable type ids to zeros
        // This will be used for tracking or initializing counts per type if needed
        ...Object.fromEntries(Object.keys(SPAWNABLE_TYPES).map(key => [SPAWNABLE_TYPES[key].id, 0])),
    }, // Multiplier for maxOnField
    upgradeSpawnInterval: {
        // Map of spawnable type ids to zeros
        ...Object.fromEntries(Object.keys(SPAWNABLE_TYPES).map(key => [SPAWNABLE_TYPES[key].id, 0])),
    }, // Seconds reduced from spawn intervals
    maxHealth: MAX_HEALTH, // Maximum health
    collectRadius: (P_X + P_Y) / 2
}

// Buff message system
let buffMessage = '';
let buffMessageStartTime = 0;
const BUFF_MESSAGE_DURATION = 3000; // 3 seconds


function resizeCanvas() {
    const devicePixelRatioScale = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Ensure CSS size matches viewport
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    // Set the internal canvas size to account for device pixel ratio (for crisp rendering)
    canvas.width = Math.floor(width * devicePixelRatioScale);
    canvas.height = Math.floor(height * devicePixelRatioScale);

    // Reset transform and scale so drawing uses CSS pixel coordinates
    ctx.setTransform(devicePixelRatioScale, 0, 0, devicePixelRatioScale, 0, 0);
}
let x = window.innerWidth / 2
let y = window.innerHeight / 2

let lastShotTime = 0
let lastFrameTime = Date.now()

let killed = 0
let ammo = 0
let gameover = false
let intro = true
let startTime = Date.now()

// Health system variables
let playerHealth = MAX_HEALTH
let lastDamageTime = 0
let screenFlashStart = 0
let isInvincible = false

// Spawnable objects and power-ups
let spawnedObjects = []
let playerPowerUps = {
    rapidFire: false,
    shotgun: false,
    slowEnemies: false,
    rapidFireEndTime: 0,
    shotgunEndTime: 0,
    slowEnemiesEndTime: 0
}

// Weapon system
let shootCooldown = SHOOT_TIMEOUT

temperature = 10
enemies = []

bullets = []

let keyPresses = {
    up: false,
    down: false,
    right: false,
    left: false,
    fire_left: false,
    fire_right: false,
    fire_up: false,
    fire_down: false,
}

let controlls = {
    w: "up",
    s: "down",
    d: "right",
    a: "left",
    ArrowUp: "fire_up",
    ArrowDown: "fire_down",
    ArrowRight: "fire_right",
    ArrowLeft: "fire_left",
}

function draw_player(x, y) {
    if (isInvincible) {
        // Blinking effect when invincible
        const timeSinceDamage = Date.now() - lastDamageTime;
        if (Math.floor(timeSinceDamage / 100) % 2 === 0) {
            ctx.fillStyle = 'rgba(0, 128, 128, 0.5)'; // Semi-transparent teal
        } else {
            ctx.fillStyle = 'rgba(0, 128, 128, 0.8)'; // More opaque teal
        }
    } else {
        ctx.fillStyle = 'teal';
    }
    ctx.fillRect(x, y, P_X, P_Y);
}

function updatePlayerPosition(deltaTime) {
    const frameSpeed = SPEED * deltaTime * 60; // Normalize to 60 FPS
    
    if (keyPresses.up) {
        y -= frameSpeed
    }
    if (keyPresses.down) {
        y += frameSpeed
    }
    if (keyPresses.left) {
        x -= frameSpeed
    }
    if (keyPresses.right) {
        x += frameSpeed
    }

    // console.log(x, y, canvas.width, canvas.height, window.innerHeight)
    x = Math.max(0, Math.min(window.innerWidth - P_X, x))
    y = Math.max(0, Math.min(window.innerHeight - P_Y, y))

}

function updateBullets() {
    const bx = x + P_X / 2
    const by = y + P_Y / 2

    const speed_x = (keyPresses.fire_right - keyPresses.fire_left) * BULLET_SPEED
    const speed_y = (keyPresses.fire_down - keyPresses.fire_up) * BULLET_SPEED

    // Check if we can shoot based on current weapon and cooldown
    if (
        (keyPresses.fire_up || keyPresses.fire_down || keyPresses.fire_left || keyPresses.fire_right) &&
        lastShotTime + shootCooldown < Date.now()
    ) {
        let bulletCount = permanentBuffs.bulletSpread;
        // Determine weapon behavior based on active power-ups
        if (playerPowerUps.shotgun) {
            // Shotgun fires bullets based on permanent buff
            bulletCount = bulletCount + 2;
        }
        
        // If no bullets to fire, don't proceed
        if (bulletCount <= 0) return;
        
        // Calculate the angle of the shot direction
        let angle = Math.atan2(speed_y, speed_x);
        // If no direction, default to right
        if (speed_x === 0 && speed_y === 0) {
            angle = 0;
        }
        const angleSpread = 10 * Math.PI / 180; // 10 degrees in radians
        const center = (bulletCount - 1) / 2;
        for (let i = 0; i < bulletCount; i++) {
            // Center bullet is at angle, others are offset by angleSpread
            const offset = (i - center) * angleSpread;
            const bulletAngle = angle + offset;
            const spreadSpeedX = Math.cos(bulletAngle) * BULLET_SPEED;
            const spreadSpeedY = Math.sin(bulletAngle) * BULLET_SPEED;
            bullets.push([bx, by, spreadSpeedX, spreadSpeedY]);
        }
        ammo = ammo + bulletCount; // Count all bullets
        
        lastShotTime = Date.now();
        intro = false;
    }
}



// run every second
function addEnemies() {
    if (Math.random() * MAX_TEMPERATURE < temperature) {
        // Decide which edge: 0=top, 1=right, 2=bottom, 3=left
        const edge = Math.floor(Math.random() * 4);
        let ex, ey;
        if (edge === 0) { // top
            ex = Math.random() * window.innerWidth;
            ey = 0;
        } else if (edge === 1) { // right
            ex = window.innerWidth;
            ey = Math.random() * window.innerHeight;
        } else if (edge === 2) { // bottom
            ex = Math.random() * window.innerWidth;
            ey = window.innerHeight;
        } else { // left
            ex = 0;
            ey = Math.random() * window.innerHeight;
        }
        enemies.push([ex, ey]);
    }

    setTimeout(addEnemies, SPAWN_TIMEOUT)
}

function increaseSpawnDensity() {
    temperature += 1
    setTimeout(increaseSpawnDensity, SPAWN_DENSITY_INCREASE_TIMEOUT)

}

function moveEnemies(deltaTime) {
    const frameSpeed = deltaTime * 60; // Normalize to 60 FPS
    
    for (let e of enemies) {
        let dx = (x - e[0])
        let dy = (y - e[1])

        // Apply slow effect if active
        let currentEnemySpeed = ENEMY_SPEED;
        if (playerPowerUps.slowEnemies) {
            currentEnemySpeed = ENEMY_SPEED * 0.5; // 50% slower
        }

        e[0] = e[0] + dx * currentEnemySpeed * frameSpeed / (Math.abs(dx) + Math.abs(dy))
        e[1] = e[1] + dy * currentEnemySpeed * frameSpeed / (Math.abs(dx) + Math.abs(dy))
    }
}

function moveBullets(deltaTime) {
    const frameSpeed = deltaTime * 60; // Normalize to 60 FPS
    
    for (let b of bullets) {
        const speed_x = b[2]
        const speed_y = b[3]

        b[0] = b[0] + speed_x * frameSpeed
        b[1] = b[1] + speed_y * frameSpeed
    }
}

function draw_enemies() {
    ctx.fillStyle = 'orange';
    for (let e of enemies) {
        ctx.fillRect(e[0], e[1], E_X, E_Y);
    }
}

function draw_bullets() {
    ctx.fillStyle = 'grey';
    for (let b of bullets) {
        ctx.beginPath();
        ctx.arc(b[0], b[1], B_R, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function draw_hearts() {
    const heartSpacing = 25;
    const totalWidth = permanentBuffs.maxHealth * heartSpacing;
    const startX = (window.innerWidth - totalWidth) / 2;
    const startY = 20;
    
    // Draw current health hearts
    for (let i = 0; i < playerHealth; i++) {
        const heartX = startX + (i * heartSpacing);
        const heartY = startY;
        
        // Draw pixelated heart using small squares
        ctx.fillStyle = '#eb4034';
        
        // Heart pattern using 5x5 grid
        const heartPattern = [
            [0,1,1,0,1,1,0],
            [1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1],
            [0,1,1,1,1,1,0],
            [0,0,1,1,1,0,0],
            [0,0,0,1,0,0,0]
        ];
        
        const pixelSize = 3;
        
        for (let row = 0; row < heartPattern.length; row++) {
            for (let col = 0; col < heartPattern[row].length; col++) {
                if (heartPattern[row][col] === 1) {
                    ctx.fillRect(
                        heartX + (col * pixelSize), 
                        heartY + (row * pixelSize), 
                        pixelSize, 
                        pixelSize
                    );
                }
            }
        }
    }
}

function draw_screen_flash() {
    if (screenFlashStart > 0 && Date.now() - screenFlashStart < SCREEN_FLASH_DURATION && !gameover) {
        ctx.fillStyle = 'rgba(235, 64, 52, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function draw_restart_button() {
    if (!gameover) return;
    
    const againX = 20
    const againY = 80

    // Draw button text as a link
    ctx.fillStyle = 'black';
    ctx.font = '20px Verdana';
    ctx.textAlign = "start";
    ctx.textBaseline = "top";
    ctx.fillText('again' ,againX, againY);
    
    // Draw underline
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(againX, againY + 20);
    ctx.lineTo(againX + 55, againY + 20);
    ctx.stroke();
}

function draw_buff_message() {
    if (buffMessage && Date.now() - buffMessageStartTime < BUFF_MESSAGE_DURATION) {
        ctx.fillStyle = '#00FF00'; // Green text
        ctx.font = '20px Verdana';
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        
        // Position message below hearts
        const messageY = 60;
        ctx.fillText(buffMessage, window.innerWidth / 2, messageY);
    }
}

function draw_collection_radius() {
    if (permanentBuffs.collectRadius > (P_X + P_Y) / 2) {
        // Draw collection radius as a subtle circle around the player
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)'; // Semi-transparent green
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // Dashed line
        
        const centerX = x + P_X / 2;
        const centerY = y + P_Y / 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, permanentBuffs.collectRadius, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Reset line dash
        ctx.setLineDash([]);
    }
}

function draw_spawned_objects() {
    for (const obj of spawnedObjects) {
        if (obj.collected) continue;
        
        ctx.fillStyle = obj.color;
        
        // Draw different shapes based on the shape property
        switch (obj.shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(obj.x + obj.size/2, obj.y + obj.size/2, obj.size/2, 0, 2 * Math.PI);
                ctx.fill();
                break;
                
            case 'triangle':
                // Draw an equilateral triangle centered at (obj.x + obj.size/2, obj.y + obj.size/2)
                // with side length = obj.size, pointing upwards
                const side = obj.size;
                const height = side * Math.sqrt(3) / 2;
                const centerX = obj.x + side / 2;
                const centerY = obj.y + side / 2;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - height / 2);
                ctx.lineTo(centerX - side / 2, centerY + height / 2);
                ctx.lineTo(centerX + side / 2, centerY + height / 2);
                ctx.closePath();
                ctx.fill();
                break;
            case 'square':
            default:
                ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
                break;
        }
        
        // Add a subtle glow effect based on shape
        if (obj.type === 'permanent_buff') {
            ctx.strokeStyle = '#000000';
        } else {
            ctx.strokeStyle = 'white';
        }
        ctx.lineWidth = 2;
        
        switch (obj.shape) {
            case 'circle':
                console.log('circle')
                ctx.beginPath();
                ctx.arc(obj.x + obj.size/2, obj.y + obj.size/2, obj.size/2 + 1, 0, 2 * Math.PI);
                ctx.stroke();
                break;
                
            case 'triangle':
                // Draw an equilateral triangle border matching the fill
                const sideGlow = obj.size + 2;
                const heightGlow = sideGlow * Math.sqrt(3) / 2;
                const centerXGlow = obj.x + obj.size / 2;
                const centerYGlow = obj.y + obj.size / 2;
                ctx.beginPath();
                ctx.moveTo(centerXGlow, centerYGlow - heightGlow / 2);
                ctx.lineTo(centerXGlow - sideGlow / 2, centerYGlow + heightGlow / 2);
                ctx.lineTo(centerXGlow + sideGlow / 2, centerYGlow + heightGlow / 2);
                ctx.closePath();
                ctx.stroke();
                break;
                
            case 'square':
            default:
                ctx.strokeRect(obj.x - 1, obj.y - 1, obj.size + 2, obj.size + 2);
                break;
        }
    }
}

function take_damage() {
    if (isInvincible) return;
    
    playerHealth--;
    lastDamageTime = Date.now();
    screenFlashStart = Date.now();
    isInvincible = true;
    
    if (playerHealth <= 0) {
        gameover = true;
    }
}

function kill_enemies() {
    for (let e of enemies) {
        const ex = e[0]
        const ey = e[1]
        for (let b of bullets) {

            const bx = b[0]
            const by = b[1]
            // b radius is B_R
            // e is a box of size E_X x E_Y

            // Find the closest point on the rectangle to the circle center
            const closestX = Math.max(ex, Math.min(bx, ex + E_X));
            const closestY = Math.max(ey, Math.min(by, ey + E_Y));

            // Calculate the distance between the circle's center and this closest point
            const distX = bx - closestX;
            const distY = by - closestY;
            const distanceSquared = distX * distX + distY * distY;

            if (distanceSquared <= B_R * B_R) {

                b[0] = -1
                b[1] = -1
                e[0] = -1
                e[1] = -1
                killed = killed + 1
            }
        }

        const vertical = ey - P_Y < y && y < ey + E_Y
        const horizontal = ex - P_X < x && x < ex + E_X
        if (vertical && horizontal) {
            take_damage()
        }
    }
    bullets = bullets.filter(b => (b[0] !== -1 || b[1] !== -1) && b[0] < window.innerWidth && b[0] > 0 && b[1] < window.innerHeight && b[1] > 0)
    enemies = enemies.filter(b => b[0] !== -1 || b[1] !== -1)
}

function update_invincibility() {
    if (isInvincible && Date.now() - lastDamageTime > INVINCIBILITY_DURATION) {
        isInvincible = false;
    }
}

function spawn_objects() {
    const currentTime = Date.now();
    
    for (const [typeKey, typeConfig] of Object.entries(SPAWNABLE_TYPES)) {
        // Skip permanent buff for now as it has special handling
        if (typeConfig.id === 'permanent_buff') continue;
        
        // Check if enough time has passed and we can spawn this type
        const secondsReduced = permanentBuffs.upgradeSpawnInterval[typeConfig.id] || 0;
        const adjustedSpawnInterval = Math.max(1000, typeConfig.spawnInterval - (secondsReduced * 1000)); // Minimum 1 second
        if (currentTime - typeConfig.lastSpawn >= adjustedSpawnInterval) {
            // Check if we haven't reached max count for this type
            const adjustedMaxOnField = typeConfig.maxOnField + permanentBuffs.maxUpgradesOnField[typeConfig.id];
            const currentCount = spawnedObjects.filter(obj => obj.type === typeConfig.id).length;
            if (currentCount < adjustedMaxOnField) {
                // Random chance to spawn
                if (Math.random() < typeConfig.spawnChance) {
                    const obj = create_spawnable_object(typeConfig);
                    spawnedObjects.push(obj);
                    typeConfig.lastSpawn = currentTime;
                }
            }
        }
    }
    
    // Handle permanent buff spawning separately
    const permanentBuffConfig = SPAWNABLE_TYPES.PERMANENT_BUFF;
    if (currentTime - permanentBuffConfig.lastSpawn >= permanentBuffConfig.spawnInterval) {
        const currentCount = spawnedObjects.filter(obj => obj.type === permanentBuffConfig.id).length;
        if (currentCount < permanentBuffConfig.maxOnField) {
            if (Math.random() < permanentBuffConfig.spawnChance) {
                const obj = create_spawnable_object(permanentBuffConfig);
                spawnedObjects.push(obj);
                permanentBuffConfig.lastSpawn = currentTime;
            }
        }
    }
    
    setTimeout(spawn_objects, 1000); // Check every second
}

function create_spawnable_object(typeConfig) {
    // Spawn at random position, avoiding edges
    const margin = 50;
    const x = margin + Math.random() * (window.innerWidth - 2 * margin);
    const y = margin + Math.random() * (window.innerHeight - 2 * margin);
    
    return {
        type: typeConfig.id,
        name: typeConfig.name,
        color: typeConfig.color,
        size: typeConfig.size,
        shape: typeConfig.shape,
        x: x,
        y: y,
        duration: typeConfig.duration || 0,
        collected: false
    };
}

function update_power_ups() {
    const currentTime = Date.now();
    
    // Check if power-ups have expired
    if (playerPowerUps.rapidFire && currentTime > playerPowerUps.rapidFireEndTime) {
        playerPowerUps.rapidFire = false;
    }
    
    if (playerPowerUps.shotgun && currentTime > playerPowerUps.shotgunEndTime) {
        playerPowerUps.shotgun = false;
    }
    
    if (playerPowerUps.slowEnemies && currentTime > playerPowerUps.slowEnemiesEndTime) {
        playerPowerUps.slowEnemies = false;
    }
    
    // Update shoot cooldown based on current active power-ups and permanent buffs
    if (playerPowerUps.rapidFire) {
        shootCooldown = (SHOOT_TIMEOUT / 3) / permanentBuffs.shootingSpeed; // 3x faster shooting + permanent buff
    } else {
        shootCooldown = SHOOT_TIMEOUT / permanentBuffs.shootingSpeed; // Normal speed + permanent buff
    }
}

function check_object_collisions() {
    for (let i = spawnedObjects.length - 1; i >= 0; i--) {
        const obj = spawnedObjects[i];

        // Calculate centers
        const objCenterX = obj.x + obj.size / 2;
        const objCenterY = obj.y + obj.size / 2;
        const playerCenterX = x + P_X / 2;
        const playerCenterY = y + P_Y / 2;

        const collectRadius = permanentBuffs.collectRadius;

        // Check if player collected the object based on distance
        if (!obj.collected) {
            const dx = objCenterX - playerCenterX;
            const dy = objCenterY - playerCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < collectRadius) {
                collect_object(obj);
                spawnedObjects.splice(i, 1);
                continue;
            }
        }
        
        const objLeft = obj.x;
        const objRight = obj.x + obj.size;
        const objTop = obj.y;
        const objBottom = obj.y + obj.size;
        
        // Check if bullet hit the object
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bullet = bullets[j];
            if (bullet[0] === -1) continue; // Skip destroyed bullets
            
            const bulletLeft = bullet[0] - B_R;
            const bulletRight = bullet[0] + B_R;
            const bulletTop = bullet[1] - B_R;
            const bulletBottom = bullet[1] + B_R;
            
            if (bulletRight > objLeft && bulletLeft < objRight && 
                bulletBottom > objTop && bulletTop < objBottom) {
                // Destroy both bullet and object
                bullet[0] = -1;
                bullet[1] = -1;
                spawnedObjects.splice(i, 1);
                break;
            }
        }
    }
    
    // Clean up destroyed bullets
    bullets = bullets.filter(b => b[0] !== -1);
}

function collect_object(obj) {
    switch (obj.type) {
        case 'health_pack':
            playerHealth = Math.min(permanentBuffs.maxHealth, playerHealth + 1);
            break;
            
        case 'rapid_fire':
            playerPowerUps.rapidFire = true;
            playerPowerUps.rapidFireEndTime = Date.now() + obj.duration;
            break;
            
        case 'shotgun':
            playerPowerUps.shotgun = true;
            playerPowerUps.shotgunEndTime = Date.now() + obj.duration;
            break;
            
        case 'instant_kill':
            // Kill all enemies on screen
            killed += enemies.length;
            enemies = []
            break;
            
        case 'slow_enemies':
            playerPowerUps.slowEnemies = true;
            playerPowerUps.slowEnemiesEndTime = Date.now() + obj.duration;
            break;
            
        case 'permanent_buff':
            apply_permanent_buff();
            break;
    }
}

function apply_permanent_buff() {
    const buffTypes = [
        'shootingSpeed',
        'bulletSpread', 
        'maxUpgradesOnField',
        'upgradeSpawnInterval',
        'maxHealth',
        'collectRadius',
    ];
    
    const randomBuff = buffTypes[Math.floor(Math.random() * buffTypes.length)];
    
    switch (randomBuff) {
        case 'shootingSpeed':
            permanentBuffs.shootingSpeed += 0.2;
            buffMessage = `shooting speed +20%! (${Math.round(permanentBuffs.shootingSpeed * 100)}%)`;
            break;
            
        case 'bulletSpread':
            permanentBuffs.bulletSpread += 1;
            buffMessage = `bullet Spread +1! (${permanentBuffs.bulletSpread} bullets total)`;
            break;
            
        case 'maxUpgradesOnField':
            // Randomly select one upgrade type to get +1 max on field
            const upgradeTypes = Object.keys(SPAWNABLE_TYPES).filter(key => 
                SPAWNABLE_TYPES[key].id !== 'permanent_buff' // Exclude permanent buff from getting upgrades
            );
            const randomUpgradeType = upgradeTypes[Math.floor(Math.random() * upgradeTypes.length)];
            const upgradeId = SPAWNABLE_TYPES[randomUpgradeType].id;
            
            permanentBuffs.maxUpgradesOnField[upgradeId] += 1;
            buffMessage = `${SPAWNABLE_TYPES[randomUpgradeType].name} +1 on field!`;
            break;
            
        case 'upgradeSpawnInterval':
            // Randomly select one upgrade type to get -1 second spawn time
            const spawnableTypes = Object.keys(SPAWNABLE_TYPES).filter(key => 
                SPAWNABLE_TYPES[key].id !== 'permanent_buff' // Exclude permanent buff from getting upgrades
            );
            const randomSpawnableType = spawnableTypes[Math.floor(Math.random() * spawnableTypes.length)];
            const spawnableId = SPAWNABLE_TYPES[randomSpawnableType].id;
            
            permanentBuffs.upgradeSpawnInterval[spawnableId] += 1;
            const newSpawnTime = Math.max(1, (SPAWNABLE_TYPES[randomSpawnableType].spawnInterval / 1000) - permanentBuffs.upgradeSpawnInterval[spawnableId]);
            buffMessage = `${SPAWNABLE_TYPES[randomSpawnableType].name} spawn time: ${newSpawnTime}s!`;
            break;
            
        case 'maxHealth':
            permanentBuffs.maxHealth += 1;
            playerHealth = Math.min(permanentBuffs.maxHealth, playerHealth + 1);
            buffMessage = `max health +1! (${permanentBuffs.maxHealth} HP)`;
            break;
            
        case 'collectRadius':
            permanentBuffs.collectRadius += (P_X + P_Y) / 4; // Increase by 50% of base radius
            buffMessage = `collection radius +50%! (${Math.round(permanentBuffs.collectRadius)}px)`;
            break;
    }
    
    buffMessageStartTime = Date.now();
}

function restart_game() {
    // Reset all game state
    playerHealth = MAX_HEALTH;
    lastDamageTime = 0;
    screenFlashStart = 0;
    isInvincible = false;
    killed = 0;
    ammo = 0;
    gameover = false;
    intro = true;
    startTime = Date.now();
    temperature = 10;
    enemies = [];
    bullets = [];
    x = window.innerWidth / 2;
    y = window.innerHeight / 2;
    lastShotTime = 0;
    lastFrameTime = Date.now();
    
    // Reset power-ups and weapons
    playerPowerUps = {
        rapidFire: false,
        shotgun: false,
        slowEnemies: false,
        rapidFireEndTime: 0,
        shotgunEndTime: 0,
        slowEnemiesEndTime: 0
    };
    shootCooldown = SHOOT_TIMEOUT;
    
    // Reset permanent buffs
    permanentBuffs = {
        shootingSpeed: 1,
        bulletSpread: 1,
        maxUpgradesOnField: {
            // Map of spawnable type ids to zeros
            ...Object.fromEntries(Object.keys(SPAWNABLE_TYPES).map(key => [SPAWNABLE_TYPES[key].id, 0])),
        },
        upgradeSpawnInterval: {
            // Map of spawnable type ids to zeros
            ...Object.fromEntries(Object.keys(SPAWNABLE_TYPES).map(key => [SPAWNABLE_TYPES[key].id, 0])),
        },
        maxHealth: MAX_HEALTH,
        collectRadius: (P_X + P_Y) / 2
    };
    
    // Clear buff message
    buffMessage = '';
    buffMessageStartTime = 0;
    
    // Clear spawned objects
    spawnedObjects = [];
    
    // Reset spawn timers
    for (const typeConfig of Object.values(SPAWNABLE_TYPES)) {
        typeConfig.lastSpawn = 0;
    }
    
    // Restart the game loop
    window.requestAnimationFrame(loop);
}

function update_text() {
    ctx.fillStyle = 'black';
    ctx.font = '20px Verdana';
    ctx.textAlign = "start";
    ctx.textBaseline = "top";

    if (killed > 0 || gameover) {
        ctx.fillText('killed: ' + killed, 20, 20);
        const apk = ammo !== 0 ? Math.floor(killed * 1000 / ammo) / 1000 : 0
        ctx.fillText('kills per bullet: ' + apk, 20, 40);
    }
    // once every spawn_timeout we check if random number<max_temp is > temp and spawn if it is so. 
    // so per minute we spawn 60/spawn_timeout * temp/max_temp

    const spawnPerMinute = Math.floor(60000 / SPAWN_TIMEOUT * Math.min(1, temperature / MAX_TEMPERATURE))
    ctx.fillText('time: ' + Math.floor((Date.now() - startTime)/1000) + 's', window.innerWidth - 250, 20);
    ctx.fillText('spawn per minute: ' + spawnPerMinute, window.innerWidth - 250, 40);
    

    if (gameover) {
        ctx.fillStyle = 'red';
        ctx.fillText('gameover', 20, 60);
        // don't print powerups
        return 
    }


    // Display power-up status
    let powerUpY = 60;
    if (playerPowerUps.rapidFire) {
        const timeLeft = Math.ceil((playerPowerUps.rapidFireEndTime - Date.now()) / 1000);
        ctx.fillStyle = SPAWNABLE_TYPES.RAPID_FIRE.color;
        ctx.fillText('rapid fire: ' + timeLeft + 's', 20, powerUpY);
        powerUpY += 25;
    }
    if (playerPowerUps.shotgun) {
        const timeLeft = Math.ceil((playerPowerUps.shotgunEndTime - Date.now()) / 1000);
        ctx.fillStyle = SPAWNABLE_TYPES.SHOTGUN.color;
        ctx.fillText('shotgun: ' + timeLeft + 's', 20, powerUpY);
        powerUpY += 25;
    }
    if (playerPowerUps.slowEnemies) {
        const timeLeft = Math.ceil((playerPowerUps.slowEnemiesEndTime - Date.now()) / 1000);
        ctx.fillStyle = SPAWNABLE_TYPES.SLOW_ENEMIES.color;
        ctx.fillText('slow: ' + timeLeft + 's', 20, powerUpY);
        powerUpY += 25;
    }
    
    // Display permanent buff status
    if (permanentBuffs.shootingSpeed > 1 || permanentBuffs.bulletSpread > 1 || 
        Object.values(permanentBuffs.maxUpgradesOnField).some(count => count > 0) || 
        Object.values(permanentBuffs.upgradeSpawnInterval).some(seconds => seconds > 0) || 
        permanentBuffs.maxHealth > MAX_HEALTH || permanentBuffs.collectRadius > (P_X + P_Y) / 2) {
        
        ctx.fillStyle = '#EAC335'; // Gold color for permanent buffs
        ctx.font = '16px Verdana';
        ctx.textAlign = "start";
        ctx.textBaseline = "top";
        
        if (permanentBuffs.shootingSpeed > 1) {
            ctx.fillText(`shooting speed +${Math.round((permanentBuffs.shootingSpeed - 1) * 100)}%`, 20, powerUpY);
            powerUpY += 20;
        }
        if (permanentBuffs.collectRadius > (P_X + P_Y) / 2) {
            const baseRadius = (P_X + P_Y) / 2;
            const increase = Math.round(((permanentBuffs.collectRadius - baseRadius) / baseRadius) * 100);
            ctx.fillText(`collection radius +${increase}%`, 20, powerUpY);
            powerUpY += 20;
        }
        if (permanentBuffs.bulletSpread > 1) {
            ctx.fillText(`bullets per shot: ${permanentBuffs.bulletSpread}`, 20, powerUpY);
            powerUpY += 20;
        }
        // Display combined spawnable object buffs for each type
        const allSpawnableTypes = Object.keys(SPAWNABLE_TYPES).filter(key => 
            SPAWNABLE_TYPES[key].id !== 'permanent_buff'
        );
        
        const buffedSpawnableTypes = allSpawnableTypes.filter(typeKey => {
            const typeId = SPAWNABLE_TYPES[typeKey].id;
            return permanentBuffs.maxUpgradesOnField[typeId] > 0 || permanentBuffs.upgradeSpawnInterval[typeId] > 0;
        });
        
        if (buffedSpawnableTypes.length > 0) {
            buffedSpawnableTypes.forEach(typeKey => {
                const typeId = SPAWNABLE_TYPES[typeKey].id;
                const upgradeName = SPAWNABLE_TYPES[typeKey].name;
                
                // Calculate spawn time
                const baseSpawnTime = SPAWNABLE_TYPES[typeKey].spawnInterval / 1000;
                const secondsReduced = permanentBuffs.upgradeSpawnInterval[typeId] || 0;
                const newSpawnTime = Math.max(1, baseSpawnTime - secondsReduced);
                
                // Calculate max on field
                const baseMax = SPAWNABLE_TYPES[typeKey].maxOnField;
                const maxIncrease = permanentBuffs.maxUpgradesOnField[typeId] || 0;
                const newMax = baseMax + maxIncrease;
                
                ctx.fillText(`${upgradeName}: every ${newSpawnTime}s (${newMax} max)`, 20, powerUpY);
                powerUpY += 20;
            });
        }
        if (permanentBuffs.maxHealth > MAX_HEALTH) {
            ctx.fillText(`max health +${permanentBuffs.maxHealth - MAX_HEALTH}`, 20, powerUpY);
            powerUpY += 20;
        }
    }


}

function print_initial_text() {
    if (!intro) return
    ctx.fillStyle = 'lightgray';
    ctx.font = '70px Verdana';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText("WASD to Move", window.innerWidth / 2, window.innerHeight / 2 - 40);
    ctx.fillText("← → ↑ ↓ to Shoot", window.innerWidth / 2, window.innerHeight / 2 + 40);
}

function loop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = currentTime;
    
    // Cap delta time to prevent huge jumps if tab becomes inactive
    const clampedDeltaTime = Math.min(deltaTime, 1/30); // Max 30 FPS equivalent
    
    // Frame rate limiting (optional - uncomment to enable)
    // const elapsed = currentTime - lastFrameTime;
    // if (elapsed < FRAME_TIME) {
    //     setTimeout(() => window.requestAnimationFrame(loop), FRAME_TIME - elapsed);
    //     return;
    // }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    print_initial_text()
    updatePlayerPosition(clampedDeltaTime)
    updateBullets()
    moveEnemies(clampedDeltaTime)
    moveBullets(clampedDeltaTime)
    draw_player(x, y)

    // Update bullets and enemies
    kill_enemies()
    update_invincibility()
    check_object_collisions()
    update_power_ups() // Update power-ups

    draw_bullets()
    draw_enemies()
    draw_hearts()
    draw_buff_message()
    //draw_collection_radius()
    draw_screen_flash()
    draw_restart_button()
    draw_spawned_objects()

    update_text()

    //debug()

    if (!gameover) {
        window.requestAnimationFrame(loop)
    }
}

function debug() {
    //console.log(bullets.length)
    //console.log(spawnedObjects)
    
    // Debug: Show collection radius
    if (permanentBuffs.collectRadius > (P_X + P_Y) / 2) {
        ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
        ctx.font = '12px Verdana';
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`Collection Radius: ${Math.round(permanentBuffs.collectRadius)}px`, 20, window.innerHeight - 40);
    }
}

function keydown(event) {
    let dirrection = controlls[event.key]
    keyPresses[dirrection] = true
}

function keyup(event) {
    let dirrection = controlls[event.key]
    keyPresses[dirrection] = false
}

setTimeout(addEnemies, SPAWN_TIMEOUT)
setTimeout(increaseSpawnDensity, SPAWN_DENSITY_INCREASE_TIMEOUT)

// Initialize spawning system
setTimeout(spawn_objects, 1000)

window.addEventListener('keydown', keydown)
window.addEventListener('keyup', keyup)

window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', resizeCanvas);

// Add click event for restart button
window.addEventListener('click', function(event) {
    if (gameover) {
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;
        
        // Check if click is within button bounds
        if (clickX >= 20 && clickX <= 20 + 60 &&
            clickY >= 80 && clickY <= 80 + 25) {
            restart_game();
        }
    }
});

window.requestAnimationFrame(loop)

