let canvas = document.getElementById("game-canvas");
let ctx = canvas.getContext("2d");

const P_X = 20
const P_Y = 20

const E_X = 20
const E_Y = 20

const B_R = 3
const SPEED = 5
const BULLET_SPEED = 10
const ENEMY_SPEED = 4
const SPAWN_TIMEOUT = 100
const MAX_TEMPERATURE = 100
const SHOOT_TIMEOUT = 50
const SPAWN_DENSITY_INCREASE_TIMEOUT = 5000

// Health system constants
const MAX_HEALTH = 1
const INVINCIBILITY_DURATION = 1000 // 1 second of invincibility after taking damage
const SCREEN_FLASH_DURATION = 200 // 200ms red flash


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

function updatePlayerPosition() {
    if (keyPresses.up) {
        y -= SPEED
    }
    if (keyPresses.down) {
        y += SPEED
    }
    if (keyPresses.left) {
        x -= SPEED
    }
    if (keyPresses.right) {
        x += SPEED
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


    // This results it bullets that don't fly but stay in place if you press left and right
    // But it is kinda fun to play with, so i'm not fixing it.
    if (
        (keyPresses.fire_up || keyPresses.fire_down || keyPresses.fire_left || keyPresses.fire_right) &&
        lastShotTime + SHOOT_TIMEOUT < Date.now()
    ) {
        bullets.push([bx, by, speed_x, speed_y])
        lastShotTime = Date.now()
        ammo = ammo + 1
        intro = false
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

function moveEnemies() {
    for (let e of enemies) {
        let dx = (x - e[0])
        let dy = (y - e[1])

        e[0] = e[0] + dx * ENEMY_SPEED / (Math.abs(dx) + Math.abs(dy))
        e[1] = e[1] + dy * ENEMY_SPEED / (Math.abs(dx) + Math.abs(dy))
    }
}

function moveBullets() {
    for (let b of bullets) {
        const speed_x = b[2]
        const speed_y = b[3]

        b[0] = b[0] + speed_x
        b[1] = b[1] + speed_y
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
    const totalWidth = MAX_HEALTH * heartSpacing;
    const startX = (window.innerWidth - totalWidth) / 2;
    const startY = 20;
    
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
    
    // // Restart enemy spawning
    // setTimeout(addEnemies, SPAWN_TIMEOUT);
    // setTimeout(increaseSpawnDensity, SPAWN_DENSITY_INCREASE_TIMEOUT);
    
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

    const spawnPerMinute = Math.floor(60000 / SPAWN_TIMEOUT * temperature / MAX_TEMPERATURE)
    ctx.fillText('time: ' + Math.floor((Date.now() - startTime)/1000) + 's', window.innerWidth - 250, 20);
    ctx.fillText('spawn per minute: ' + spawnPerMinute, window.innerWidth - 250, 40);
    

    if (gameover) {
        ctx.fillStyle = 'red';
        ctx.fillText('gameover', 20, 60);
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    print_initial_text()
    updatePlayerPosition()
    updateBullets()
    moveEnemies()
    moveBullets()
    draw_player(x, y)

    // Update bullets and enemies
    kill_enemies()
    update_invincibility()

    draw_bullets()
    draw_enemies()
    draw_hearts()
    draw_screen_flash()
    draw_restart_button()

    update_text()

    debug()

    if (!gameover) {
        window.requestAnimationFrame(loop)
    }
}

function debug() {
    //console.log(bullets.length)
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

