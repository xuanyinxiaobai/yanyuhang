// 使用 requestAnimationFrame 来实现动画，这是比 setTimeout 或 setInterval 更合适的方式。
// 它会根据浏览器的刷新率优化动画性能。某些浏览器可能不支持，因此需要使用前缀，添加一个补丁函数。
window.requestAnimFrame = ( function() {
	return window.requestAnimationFrame || // 标准请求动画帧
				window.webkitRequestAnimationFrame || // Webkit 内核的前缀
				window.mozRequestAnimationFrame || // Firefox 的前缀
				function( callback ) {
					window.setTimeout( callback, 1000 / 60 ); // 如果都不支持，使用 setTimeout 模拟每秒 60 帧
				};
})();

// 设置基本的变量，这些变量将在整个演示中使用
var canvas = document.getElementById( 'canvas' ), // 获取画布元素
		ctx = canvas.getContext( '2d' ), // 获取 2D 上下文
		cw = window.innerWidth, // 画布宽度为窗口宽度
		ch = window.innerHeight, // 画布高度为窗口高度
		fireworks = [], // 烟花集合
		particles = [], // 粒子集合
		hue = 120, // 初始色调为绿色
		limiterTotal = 5, // 限制每 5 帧发射一个烟花
		limiterTick = 0, // 当前帧数计数器
		timerTotal = 3, // 自动发射烟花的计时器，每 80 帧发射一个
		timerTick = 0, // 自动发射计时器
		mousedown = false, // 是否按下鼠标
		mx, // 鼠标 x 坐标
		my; // 鼠标 y 坐标

// 设置画布的尺寸
canvas.width = cw;
canvas.height = ch;

// 设置一些函数，作为后续操作的占位符

// 生成一个范围内的随机数
function random( min, max ) {
	return Math.random() * ( max - min ) + min; // 返回[min, max)范围内的随机数
}

// 计算两点之间的距离
function calculateDistance( p1x, p1y, p2x, p2y ) {
	var xDistance = p1x - p2x,
			yDistance = p1y - p2y;
	return Math.sqrt( Math.pow( xDistance, 2 ) + Math.pow( yDistance, 2 ) ); // 使用勾股定理计算距离
}

// 创建烟花对象
function Firework( sx, sy, tx, ty ) {
	// 初始化烟花的坐标
	this.x = sx;
	this.y = sy;
	this.sx = sx; // 起始坐标
	this.sy = sy;
	this.tx = tx; // 目标坐标
	this.ty = ty;
	this.distanceToTarget = calculateDistance( sx, sy, tx, ty ); // 计算起始点到目标点的距离
	this.distanceTraveled = 0; // 初始化已行进的距离
	this.coordinates = []; // 存储烟花的轨迹坐标
	this.coordinateCount = 3; // 初始轨迹点数量
	// 填充轨迹坐标
	while( this.coordinateCount-- ) {
		this.coordinates.push( [ this.x, this.y ] );
	}
	this.angle = Math.atan2( ty - sy, tx - sx ); // 计算目标点的角度
	this.speed = 10; // 初始速度
	this.acceleration = 1.05; // 加速度
	this.brightness = random( 50, 70 ); // 随机亮度
	this.targetRadius = 10; // 目标圆半径
}

// 更新烟花的位置和状态
Firework.prototype.update = function( index ) {
	// 删除轨迹数组中的最后一个元素
	this.coordinates.pop();
	// 将当前坐标添加到轨迹数组的开头
	this.coordinates.unshift( [ this.x, this.y ] );
	
	// 目标半径的动画效果
	if( this.targetRadius < 8 ) {
		this.targetRadius += 0.3; // 扩大
	} else {
		this.targetRadius = 1; // 缩小
	}
	
	// 根据加速度更新烟花速度
	this.speed *= this.acceleration;
	
	// 根据角度和速度计算 x 和 y 方向的速度
	var vx = Math.cos( this.angle ) * this.speed,
			vy = Math.sin( this.angle ) * this.speed;
	// 计算烟花将要前进的距离
	this.distanceTraveled = calculateDistance( this.sx, this.sy, this.x + vx, this.y + vy );
	
	// 如果距离已达到目标，创建粒子效果，并移除烟花
	if( this.distanceTraveled >= this.distanceToTarget ) {
		createParticles( this.tx, this.ty ); // 创建粒子
		fireworks.splice( index, 1 ); // 删除烟花
	} else {
		// 如果目标未达，继续前进
		this.x += vx;
		this.y += vy;
	}
}

// 绘制烟花
Firework.prototype.draw = function() {
	ctx.beginPath();
	// 连接烟花的上一轨迹点和当前点
	ctx.moveTo( this.coordinates[ this.coordinates.length - 1][ 0 ], this.coordinates[ this.coordinates.length - 1][ 1 ] );
	ctx.lineTo( this.x, this.y );
	// 根据色调和亮度设置烟花的颜色
	ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
	ctx.stroke();
	
	ctx.beginPath();
	// 绘制目标的圆形
	ctx.arc( this.tx, this.ty, this.targetRadius, 0, Math.PI * 2 );
	ctx.stroke();
}

// 创建粒子
function Particle( x, y ) {
	this.x = x;
	this.y = y;
	this.coordinates = [];
	this.coordinateCount = 5; // 粒子轨迹点数量
	// 填充粒子的初始坐标
	while( this.coordinateCount-- ) {
		this.coordinates.push( [ this.x, this.y ] );
	}
	this.angle = random( 0, Math.PI * 2 ); // 随机方向
	this.speed = random( 12, 15 ); // 随机速度
	this.speed *= Math.sin(Math.random() * Math.PI - Math.PI / 2); // 调整粒子速度
	this.friction = 0.95; // 摩擦力
	this.gravity = 1.5; // 重力
	this.hue = random( hue - 20, hue + 20 ); // 色调变化
	this.brightness = random( 50, 80 ); // 亮度
	this.alpha = 1; // 初始不透明度
	this.decay = random( 0.010, 0.02 ); // 衰减速度
}

// 更新粒子
Particle.prototype.update = function( index ) {
	this.coordinates.pop(); // 删除轨迹中的最后一个点
	this.coordinates.unshift( [ this.x, this.y ] ); // 添加当前坐标
	this.speed *= this.friction; // 摩擦力作用下减少速度
	this.x += Math.cos( this.angle ) * this.speed; // 更新 x 坐标
	this.y += Math.sin( this.angle ) * this.speed + this.gravity; // 更新 y 坐标并加入重力
	this.alpha -= this.decay; // 衰减不透明度
	
	// 当粒子完全消失时，移除它
	if( this.alpha <= this.decay ) {
		particles.splice( index, 1 );
	}
}

// 绘制粒子
Particle.prototype.draw = function() {
	ctx.beginPath();
	ctx.lineWidth = 3; // 设置线宽
	ctx.moveTo( this.coordinates[ this.coordinates.length - 1 ][ 0 ], this.coordinates[ this.coordinates.length - 1 ][ 1 ] );
	ctx.lineTo( this.x, this.y );
	// 设置粒子的颜色和透明度
	ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
	ctx.stroke();
}

// 创建粒子爆炸效果
function createParticles( x, y ) {
	var particleCount = 100; // 增加粒子数量以形成更大的爆炸效果
	while( particleCount-- ) {
		particles.push( new Particle( x, y ) );
	}
}

let isShapeExclusive = false; // 是否处于形状绘制模式

let circleFireworksDone = false; // 标志变量，确保圆形烟花只触发一次

function drawCircleFireworks(centerX, centerY, radius, count) {
    let angleStep = (2 * Math.PI) / count; // 每个烟花之间的角度间隔

    for (let i = 0; i < count; i++) {
        let angle = i * angleStep; // 当前烟花的角度
        let x = centerX + radius * Math.cos(angle); // 烟花的目标X坐标
        let y = centerY + radius * Math.sin(angle); // 烟花的目标Y坐标

        // 发射烟花到目标位置
        fireworks.push(new Firework(centerX, centerY, x, y));
    }
}

function checkAndTriggerCircleFireworks() {
    let now = new Date(); // 获取当前时间
    let currentTime = now.getFullYear() * 100000000 +
        (now.getMonth() + 1) * 1000000 +
        now.getDate() * 10000 +
        now.getHours() * 100 +
        now.getMinutes();

    if (currentTime >= 202501010000  && !circleFireworksDone) {
        // 绘制圆形烟花，半径200，中心点为屏幕中央，包含20个烟花
        drawCircleFireworks(cw / 2, ch / 2, 200, 20);
        circleFireworksDone = true; // 标记为已触发
    }
}



let heartFireworksDone = false; // 标记形状烟花是否已经绘制完成
// 绘制心形烟花的函数
function drawHeartFireworksGradually(centerX, centerY, size, count, duration) {
    isShapeExclusive = true; // 开启独占模式
    let interval = duration / count; // 每个烟花发射的时间间隔
    let currentIndex = 0; // 当前要发射的烟花索引
    let angleStep = Math.PI / (count / 2); // 每次扩展的角度步长，左右两边对称

    function heartFunction(t) {
        // 参数方程：心形的点
        let x = 16 * Math.sin(t) ** 3;
        let y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        return { x: x * size, y: y * size }; // 按比例缩放大小
    }

    let timer = setInterval(() => {
        if (currentIndex >= count / 2) {
            clearInterval(timer); // 所有烟花发射完毕后清除定时器
            isShapeExclusive = false; // 恢复正常模式
            return;
        }

        let angle = currentIndex * angleStep; // 当前索引对应的角度

        // 左右两边对称点
        let leftPoint = heartFunction(-angle); // 左侧点
        let rightPoint = heartFunction(angle); // 右侧点

        // 发射烟花，起点为屏幕底部中心 (cw / 2, ch)
        fireworks.push(new Firework(cw / 2, ch, centerX + leftPoint.x, centerY + leftPoint.y));
        fireworks.push(new Firework(cw / 2, ch, centerX + rightPoint.x, centerY + rightPoint.y));

        currentIndex++; // 继续发射下一个对称点
    }, interval);
}

// 检查时间并触发心形烟花的函数
function checkAndTriggerGradualHeartFireworks() {
    let now = new Date();
    let currentTime = now.getFullYear() * 100000000 +
        (now.getMonth() + 1) * 1000000 +
        now.getDate() * 10000 +
        now.getHours() * 100 +
        now.getMinutes();

    if (currentTime >= 202501010000  && !heartFireworksDone) {
        // 绘制心形烟花，独占屏幕
        drawHeartFireworksGradually(cw / 2, ch / 2, 25, 80, 3000);
        heartFireworksDone = true; // 标记为已触发
    }
}

function loop() {
    requestAnimFrame(loop);

    hue += 0.5;
    if (hue >= 30) hue = -10;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';

    let i = fireworks.length;
    while (i--) {
        fireworks[i].draw();
        fireworks[i].update(i);
    }

    i = particles.length;
    while (i--) {
        particles[i].draw();
        particles[i].update(i);
    }

    // 判断是否处于形状独占模式
    if (!isShapeExclusive) {
        // 正常发射随机烟花
        if (timerTick >= timerTotal) {
            if (!mousedown) {
                fireworks.push(new Firework(random(cw / 5, cw / 5 * 4), ch, random(0, cw), random(0, ch / 2)));
                timerTick = 0;
            }
        } else {
            timerTick++;
        }

        if (limiterTick >= limiterTotal) {
            if (mousedown) {
                fireworks.push(new Firework(cw / 2, ch, mx, my));
                limiterTick = 0;
            }
        } else {
            limiterTick++;
        }
    }

    // 检测并触发逐步绘制的圆形烟花
    checkAndTriggerGradualHeartFireworks();
    // 检测并触发圆形烟花
    checkAndTriggerCircleFireworks();


}


// 处理鼠标事件，更新鼠标坐标
canvas.addEventListener( 'mousemove', function( e ) {
	mx = e.pageX - canvas.offsetLeft;
	my = e.pageY - canvas.offsetTop;
});

// 鼠标按下和松开事件，控制发射
canvas.addEventListener( 'mousedown', function( e ) {
	e.preventDefault();
	mousedown = true;
});

canvas.addEventListener( 'mouseup', function( e ) {
	e.preventDefault();
	mousedown = false;
});

// 页面加载完成后，启动主循环
window.onload = loop;
