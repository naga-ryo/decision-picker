(() => {
    // 状態管理
    const state = {
        items: ['焼肉', '寿司', 'ラーメン', 'ピザ', '中華'],
        currentMode: 'roulette',
        isSpinning: false,
        colors: ['#0d1f2d', '#2b0b14', '#0d2611', '#26190a', '#140b2b', '#260a26']
    };

    // 物理演算用ステート
    const physics = {
        wheelAngle: 0,
        wheelVelocity: 0,
        ballAngle: 0,
        ballVelocity: 0,
        ballRadius: 265,
        isActive: false,
        trail: [] 
    };

    // DOMキャッシュ
    const ui = {
        modeBtns: document.querySelectorAll('.mode-btn'),
        views: document.querySelectorAll('.game-view'),
        btnSpin: document.getElementById('btnSpin'),
        itemInput: document.getElementById('itemInput'),
        btnAdd: document.getElementById('btnAdd'),
        poolList: document.getElementById('poolList'),
        rCtx: document.getElementById('rouletteCanvas').getContext('2d'),
        sReels: [
            document.getElementById('slotReel1'),
            document.getElementById('slotReel2'),
            document.getElementById('slotReel3')
        ],
        cTable: document.getElementById('cardTable'),
        overlay: document.getElementById('resultOverlay'),
        resultLabel: document.getElementById('resultLabel'),
        resultBox: document.getElementById('resultBox'),
        resultNum: document.getElementById('resultNum'),
        resultText: document.getElementById('resultText'),
        btnClose: document.getElementById('btnClose')
    };

    const init = () => {
        renderLists();
        switchMode(state.currentMode);
        bindEvents();
        gsap.ticker.add(physicsLoop);
    };

    const renderLists = () => {
        ui.poolList.innerHTML = '';
        state.items.forEach((item, idx) => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <span class="list-item-num">No.${idx + 1}</span>
                <span class="item-text" data-idx="${idx}" title="クリックで直接編集">${escapeHTML(item)}</span>
                <button class="btn-delete" data-idx="${idx}">×</button>
            `;
            ui.poolList.appendChild(div);
        });
        updateActiveGameView();
    };

    // XSS対策
    const escapeHTML = (str) => str.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]));

    const switchMode = (mode) => {
        state.currentMode = mode;
        ui.modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
        ui.views.forEach(v => v.classList.toggle('active', v.id === `view-${mode}`));
        updateActiveGameView();
    };

    const updateActiveGameView = () => {
        if (state.currentMode === 'roulette') {
            physics.ballAngle = 0; physics.ballRadius = 265; physics.trail = []; drawRoulette();
        }
        if (state.currentMode === 'slot') buildSlot();
        if (state.currentMode === 'card') buildCards();
    };

    // ====================================================================
    // 1. ルーレット
    // ====================================================================
    const pocketOuter = 190;
    const pocketInner = 110;

    const drawRoulette = () => {
        const ctx = ui.rCtx;
        const total = state.items.length;
        ctx.clearRect(0, 0, 600, 600);
        const center = 300;
        
        ctx.beginPath();
        ctx.arc(center, center, 290, 0, Math.PI * 2);
        ctx.fillStyle = '#221105';
        ctx.fill();
        ctx.lineWidth = 15;
        ctx.strokeStyle = '#150800'; 
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(center, center, 280, 0, Math.PI * 2);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#4a2511';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(center, center, 275, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0a';
        ctx.fill();

        ctx.fillStyle = '#d4af37';
        for (let i = 0; i < 8; i++) {
            const defA = (Math.PI * 2 / 8) * i;
            ctx.beginPath();
            ctx.arc(center + Math.cos(defA) * 225, center + Math.sin(defA) * 225, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.beginPath();
            ctx.arc(center + Math.cos(defA) * 225 - 2, center + Math.sin(defA) * 225 + 2, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#d4af37';
        }

        if (total > 0) {
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(physics.wheelAngle);
            const arc = (Math.PI * 2) / total;

            for (let i = 0; i < total; i++) {
                const a = i * arc;
                ctx.beginPath();
                ctx.arc(0, 0, pocketOuter, a, a + arc);
                ctx.arc(0, 0, pocketInner, a + arc, a, true);
                ctx.closePath();
                ctx.fillStyle = state.colors[i % state.colors.length];
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0; 
                
                ctx.save();
                ctx.rotate(a + arc / 2);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 26px Impact';
                ctx.translate(pocketOuter - 30, 0);
                ctx.rotate(Math.PI / 2);
                ctx.fillText(i + 1, 0, 0);
                ctx.restore();
            }

            for (let i = 0; i < total; i++) {
                const a = i * arc;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a)*pocketInner, Math.sin(a)*pocketInner);
                ctx.lineTo(Math.cos(a)*pocketOuter, Math.sin(a)*pocketOuter);
                ctx.strokeStyle = '#d4af37';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            ctx.beginPath();
            ctx.arc(0, 0, pocketInner, 0, Math.PI * 2);
            ctx.fillStyle = '#3a1f0a';
            ctx.fill();
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#d4af37';
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fillStyle = '#d4af37';
            ctx.fill();
            
            ctx.fillStyle = '#fff';
            for(let i=0; i<4; i++){
                ctx.fillRect(-3, -40, 6, 80);
                ctx.rotate(Math.PI/2);
            }
            ctx.restore();
        }

        if (physics.isActive) {
            physics.trail.push({a: physics.ballAngle, r: physics.ballRadius, v: Math.abs(physics.ballVelocity)});
            if(physics.trail.length > 12) physics.trail.shift();
        } else if (physics.trail.length > 0) {
            physics.trail.shift(); 
        }
        
        for (let i = 0; i < physics.trail.length; i++) {
            const t = physics.trail[i];
            const intensity = Math.min(t.v / 0.3, 1);
            const alpha = (i / physics.trail.length) * 0.6 * intensity;
            const size = 10 * (i / physics.trail.length);
            
            ctx.beginPath();
            ctx.arc(center + Math.cos(t.a) * t.r, center + Math.sin(t.a) * t.r, size, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
        }

        const bx = center + Math.cos(physics.ballAngle) * physics.ballRadius;
        const by = center + Math.sin(physics.ballAngle) * physics.ballRadius;

        ctx.beginPath();
        ctx.arc(bx, by, 11, 0, Math.PI * 2);
        const grd = ctx.createRadialGradient(bx-4, by-4, 1, bx, by, 11);
        grd.addColorStop(0, '#fff');
        grd.addColorStop(0.4, '#ddd');
        grd.addColorStop(1, '#666');
        ctx.fillStyle = grd;
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;
        ctx.fill();
        ctx.shadowBlur = 0;
    };

    const physicsLoop = () => {
        if (state.currentMode !== 'roulette') return;

        if (physics.isActive) {
            physics.wheelVelocity *= 0.993; 
            if (physics.wheelVelocity > -0.01) physics.wheelVelocity = -0.01; 
        }
        physics.wheelAngle += physics.wheelVelocity;

        if (!physics.isActive) {
            if (state.items.length > 0) physics.ballAngle += physics.wheelVelocity;
            drawRoulette();
            return;
        }

        physics.ballVelocity *= 0.998;

        let relVel = physics.ballVelocity - physics.wheelVelocity;
        const kineticFriction = 0.0006;
        if (relVel > kineticFriction) {
            physics.ballVelocity -= kineticFriction;
        } else if (relVel < -kineticFriction) {
            physics.ballVelocity += kineticFriction;
        } else {
            physics.ballVelocity = physics.wheelVelocity; 
        }
        physics.ballAngle += physics.ballVelocity;

        const fallThreshold = 0.25;
        let targetRadius = 265;
        if (Math.abs(physics.ballVelocity) < fallThreshold) {
            const speedRatio = Math.max(Math.abs(physics.ballVelocity) / fallThreshold, 0);
            targetRadius = 150 + (265 - 150) * Math.pow(speedRatio, 1.2);
        }
        physics.ballRadius += (targetRadius - physics.ballRadius) * 0.05;

        if (physics.ballRadius > 215 && physics.ballRadius < 235) {
            for (let i=0; i<8; i++) {
                const defA = (Math.PI*2/8)*i;
                let diff = Math.abs(physics.ballAngle - defA) % (Math.PI*2);
                if (diff > Math.PI) diff = Math.PI*2 - diff;
                if (diff < 0.06 && Math.random() < 0.4) {
                    physics.ballVelocity *= 0.8;
                    physics.ballRadius += 3;
                    physics.ballAngle += (Math.random()-0.5)*0.08;
                }
            }
        }

        if (physics.ballRadius <= pocketOuter && physics.ballRadius >= pocketInner) {
            const total = state.items.length;
            const arc = (Math.PI * 2) / total;
            let relAngle = (physics.ballAngle - physics.wheelAngle + Math.PI * 100) % (Math.PI * 2);
            const offset = relAngle % arc;
            const collisionThreshold = 0.06; 

            relVel = physics.ballVelocity - physics.wheelVelocity;
            const passThreshold = 0.035; 
            const restitution = Math.min(0.8, Math.max(0.1, 1.0 - Math.abs(relVel) * 15));

            if (offset < collisionThreshold && relVel < 0) {
                if (Math.abs(relVel) > passThreshold) {
                    physics.ballVelocity = physics.wheelVelocity + relVel * 0.5;
                    physics.ballRadius += 2.0; 
                } else {
                    physics.ballVelocity = physics.wheelVelocity - relVel * restitution;
                    physics.ballAngle = physics.wheelAngle + (Math.floor(relAngle / arc) * arc + collisionThreshold);
                }
            } else if (offset > arc - collisionThreshold && relVel > 0) {
                if (Math.abs(relVel) > passThreshold) {
                    physics.ballVelocity = physics.wheelVelocity + relVel * 0.5;
                    physics.ballRadius += 2.0;
                } else {
                    physics.ballVelocity = physics.wheelVelocity - relVel * restitution;
                    physics.ballAngle = physics.wheelAngle + (Math.floor(relAngle / arc) * arc + arc - collisionThreshold);
                }
            }
        }

        if (physics.ballRadius <= 155) {
            physics.ballRadius = 150;
            relVel = physics.ballVelocity - physics.wheelVelocity;
            physics.ballVelocity = physics.wheelVelocity + relVel * 0.85;

            if (Math.abs(relVel) < 0.01) {
                physics.isActive = false;
                physics.ballVelocity = physics.wheelVelocity; 
                
                const total = state.items.length;
                const arc = (Math.PI * 2) / total;
                let relAngle = (physics.ballAngle - physics.wheelAngle + Math.PI * 100) % (Math.PI*2);
                
                const winIdx = Math.floor(relAngle / arc);
                finishWithDelay(winIdx);
            }
        }
        
        drawRoulette(); 
    };

    const startRoulettePhysics = () => {
        physics.ballAngle = Math.random() * Math.PI * 2;
        physics.ballVelocity = 0.35 + Math.random() * 0.15; 
        physics.wheelVelocity = -(0.35 + Math.random() * 0.15); 
        physics.ballRadius = 265; 
        physics.isActive = true;
        physics.trail = [];
    };

    // ====================================================================
    // 2. スロット
    // ====================================================================
    const buildSlot = () => {
        ui.sReels.forEach(reel => {
            reel.innerHTML = '';
            if (state.items.length === 0) return;
            
            const items = Array.from({length: state.items.length}, (_, i) => i + 1);
            const displayItems = Array(120).fill(items).flat(); 
            displayItems.forEach(num => {
                const el = document.createElement('div');
                el.className = 'slot-item';
                el.textContent = num;
                reel.appendChild(el);
            });
            gsap.set(reel, { y: 0 });
        });
    };

    const animateSlot = (winIdx) => {
        const cellHeight = 140;
        const total = state.items.length;
        
        const preSpinDuration = 4.5;
        const preSpinY = -(cellHeight * total * 35);

        const targetY1 = preSpinY - (winIdx * cellHeight) - (cellHeight * total * 6);
        const targetY2 = preSpinY - (winIdx * cellHeight) - (cellHeight * total * 8);
        const targetY3 = preSpinY - (winIdx * cellHeight) - (cellHeight * total * 12); 

        const fIdx1 = (winIdx + 1) % total;
        const fIdx2 = (winIdx + 2) % total;
        const fIdx3 = (winIdx + 3) % total;
        const fakeY1 = preSpinY - (fIdx1 * cellHeight) - (cellHeight * total * 4);
        const fakeY2 = preSpinY - (fIdx2 * cellHeight) - (cellHeight * total * 6);
        const fakeY3 = preSpinY - (fIdx3 * cellHeight) - (cellHeight * total * 10);

        ui.sReels.forEach(r => gsap.set(r, { y: 0 }));
        const tl = gsap.timeline();

        tl.to(ui.sReels, { y: preSpinY, duration: preSpinDuration, ease: "power2.in" });
        
        const isFullRestart = Math.random() < (25 / 40);

        const gatagata = (reels) => {
            reels.forEach(r => { gsap.to(r, { y: "+=12", duration: 0.04, yoyo: true, repeat: 5 }); });
        };
        const flashFreeze = () => {
            gsap.fromTo('.slot-display', { backgroundColor: 'rgba(255, 42, 85, 0.6)' }, { backgroundColor: '#ffffff', duration: 0.08, repeat: 5, yoyo: true, onComplete: () => {
                gsap.set('.slot-display', { backgroundColor: '' }); 
            }});
            ui.sReels.forEach(r => { gsap.to(r, { y: "+=20", duration: 0.06, yoyo: true, repeat: 2 }); });
        };
        const success = () => {
            gsap.fromTo('.slot-display', 
                { boxShadow: 'inset 0 0 50px rgba(255, 215, 0, 0.8)' }, 
                { boxShadow: 'inset 0 15px 25px rgba(0,0,0,0.9)', duration: 0.5, yoyo: true, repeat: 3, onComplete: () => {
                    gsap.set('.slot-display', { boxShadow: 'inset 0 15px 25px rgba(0,0,0,0.9)' });
                }}
            );
            finishWithDelay(winIdx);
        };

        if (isFullRestart) {
            const patternIdx = Math.floor(Math.random() * 25);
            const fakeType = patternIdx % 5;
            const actionType = Math.floor(patternIdx / 5);
            
            let cfIdx1, cfIdx2, cfIdx3;
            if (fakeType === 0) { 
                cfIdx1 = (winIdx + 1) % total; cfIdx2 = cfIdx1; cfIdx3 = (cfIdx1 + 1) % total;
            } else if (fakeType === 1) { 
                cfIdx1 = (winIdx + 1) % total; cfIdx2 = (cfIdx1 + 1) % total; cfIdx3 = cfIdx1;
            } else if (fakeType === 2) { 
                cfIdx1 = (winIdx + 1) % total; cfIdx2 = (cfIdx1 + 1) % total; cfIdx3 = cfIdx2;
            } else if (fakeType === 3) { 
                cfIdx1 = (winIdx + 1) % total; cfIdx2 = (winIdx + 2) % total; cfIdx3 = (winIdx + 3) % total;
            } else { 
                cfIdx1 = (winIdx + 1) % total; cfIdx2 = cfIdx1; cfIdx3 = cfIdx1;
            }
            
            const cfakeY1 = preSpinY - (cfIdx1 * cellHeight) - (cellHeight * total * 4);
            const cfakeY2 = preSpinY - (cfIdx2 * cellHeight) - (cellHeight * total * 5);
            const cfakeY3 = preSpinY - (cfIdx3 * cellHeight) - (cellHeight * total * 6);

            tl.to(ui.sReels[0], { y: cfakeY1, duration: 1.2, ease: "back.out(1.2)" })
              .to(ui.sReels[1], { y: cfakeY2, duration: 1.5, ease: "back.out(1.2)" }, "-=0.8")
              .to(ui.sReels[2], { y: cfakeY3, duration: 1.8, ease: "back.out(1.2)" }, "-=1.0");

            if (actionType === 0) {
                tl.to({}, { duration: 0.3 }); 
            } else if (actionType === 1) {
                tl.to({}, { duration: 1.5 }); 
            } else if (actionType === 2) {
                tl.to({}, { duration: 0.5 }).add(() => gatagata(ui.sReels)).to({}, { duration: 0.5 }); 
            } else if (actionType === 3) {
                tl.to({}, { duration: 0.5 }).add(() => flashFreeze()).to({}, { duration: 0.2 }); 
            } else {
                tl.to({}, { duration: 0.4 }).to(ui.sReels, { y: "+=70", duration: 0.5, ease: "power2.inOut" }).to({}, { duration: 0.2 }); 
            }

            const extraSpins = cellHeight * total * 4;
            const restartEase = ["power3.out", "back.out(1.5)", "bounce.out", "elastic.out(1, 0.5)", "power4.out"][patternIdx % 5];
            
            tl.to(ui.sReels[0], { y: targetY1 - extraSpins, duration: 1.2, ease: restartEase })
              .to(ui.sReels[1], { y: targetY2 - extraSpins, duration: 1.5, ease: restartEase }, "-=1.0")
              .to(ui.sReels[2], { y: targetY3 - extraSpins, duration: 1.8, ease: restartEase }, "-=1.3");
            tl.to({}, { duration: 0, onComplete: success });

        } else {
            const patternIdx = Math.floor(Math.random() * 15);
            const reachType = patternIdx % 3;
            const danceType = Math.floor(patternIdx / 3);

            if (reachType === 0) {
                tl.to(ui.sReels[0], { y: targetY1, duration: 1.5, ease: "back.out(1.2)" })
                  .to(ui.sReels[1], { y: targetY2, duration: 1.8, ease: "back.out(1.2)" }, "-=1.0");
            } else if (reachType === 1) {
                tl.to(ui.sReels[0], { y: targetY1, duration: 1.0, ease: "power2.out" })
                  .to(ui.sReels[1], { y: targetY2, duration: 2.0, ease: "bounce.out" }, "-=0.5");
            } else {
                tl.to(ui.sReels[0], { y: targetY1, duration: 1.2, ease: "back.out(1.2)" });
            }

            const activeReels = reachType === 2 ? [ui.sReels[1], ui.sReels[2]] : [ui.sReels[2]];
            const activeTargets = reachType === 2 ? [targetY2, targetY3] : [targetY3];

            if (danceType === 0) {
                tl.to(activeReels, { y: (i) => activeTargets[i], duration: 2.5, ease: "back.out(1.2)" }, "-=1.5");
            } else if (danceType === 1) {
                tl.to(activeReels, { y: (i) => activeTargets[i] + cellHeight, duration: 2.0, ease: "power2.out" }, "-=1.5")
                  .to({}, { duration: 0.3 })
                  .to(activeReels, { y: (i) => activeTargets[i], duration: 0.6, ease: "bounce.out" });
            } else if (danceType === 2) {
                tl.to(activeReels, { y: (i) => activeTargets[i] - cellHeight * 1.5, duration: 2.2, ease: "power2.out" }, "-=1.5")
                  .to({}, { duration: 0.3 })
                  .to(activeReels, { y: (i) => activeTargets[i], duration: 0.8, ease: "back.out(2)" });
            } else if (danceType === 3) {
                tl.to(activeReels, { y: (i) => activeTargets[i] + cellHeight * 2, duration: 1.5, ease: "power1.out" }, "-=1.5")
                  .to(activeReels, { y: (i) => activeTargets[i], duration: 3.5, ease: "power1.out" });
            } else {
                tl.to(activeReels, { y: (i) => activeTargets[i] + cellHeight * 0.8, duration: 1.8, ease: "power2.out" }, "-=1.5")
                  .add(() => gatagata(activeReels))
                  .to({}, { duration: 0.5 })
                  .to(activeReels, { y: (i) => activeTargets[i], duration: 0.5, ease: "bounce.out" });
            }
            tl.to({}, { duration: 0, onComplete: success });
        }
    };

    // ====================================================================
    // 3. カード
    // ====================================================================
    const buildCards = () => {
        ui.cTable.innerHTML = '';
        if (state.items.length === 0) return;

        state.items.forEach((item, idx) => {
            const wrap = document.createElement('div');
            wrap.className = 'poker-card';
            wrap.dataset.idx = idx;
            wrap.innerHTML = `
                <div class="card-face card-back"></div>
                <div class="card-face card-front">${idx + 1}</div>
            `;
            ui.cTable.appendChild(wrap);
        });

        gsap.set('.poker-card', {
            left: '50%', top: '50%', xPercent: -50, yPercent: -50,
            x: 0, y: 0, rotateZ: 0, opacity: 1, scale: 1, zIndex: 1
        });
    };

    const animateCard = (winIdx) => {
        const cards = Array.from(document.querySelectorAll('.poker-card'));
        const total = cards.length;
        const tl = gsap.timeline();

        // 共通シャッフル
        for (let j = 0; j < 4; j++) {
            tl.to(cards, {
                x: () => (Math.random() > 0.5 ? -80 : 80), 
                y: () => (Math.random() - 0.5) * 40,
                rotateZ: () => (Math.random() - 0.5) * 20,
                duration: 0.12,
                ease: "power1.inOut"
            })
            .set(cards, { zIndex: () => Math.floor(Math.random() * 100) })
            .to(cards, { x: 0, y: 0, rotateZ: 0, duration: 0.12 });
        }

        // 基本の並びへ
        tl.to(cards, {
            x: (i) => (i - total/2 + 0.5) * Math.min(40, 300/total), 
            y: 0, rotateZ: (i) => (i - total/2) * 5,
            duration: 0.5, ease: "power3.out"
        });

        const realCard = cards[winIdx];
        const others = cards.filter((_, i) => i !== winIdx);
        const dummyIdx = (winIdx + 1) % total;
        const dummyCard = cards[dummyIdx];
        
        const pattern = Math.floor(Math.random() * 10); 

        if (pattern === 0) { // 1. 王道フェイント
            tl.to(dummyCard, { y: -30, scale: 1.1, boxShadow: '0 0 20px #d4af37', duration: 0.4, ease: "power1.out" })
              .to({}, { duration: 0.5 }) 
              .to(dummyCard, { y: 0, scale: 1, boxShadow: '-6px 8px 20px rgba(0,0,0,0.7)', duration: 0.2 }, "swap")
              .set(realCard, { zIndex: 999 }, "swap")
              .to(realCard, { y: -50, scale: 1.2, duration: 0.3, ease: "power3.out" }, "swap")
              .to(realCard, { x: 0, y: -20, rotateZ: 0, rotateY: 180, scale: 1.4, duration: 0.6, delay: 0.2, ease: "back.out(1.2)", onComplete: () => finishWithDelay(winIdx) });

        } else if (pattern === 1) { // 2. 即決ストレート
            tl.to({}, { duration: 0.5 })
              .set(realCard, { zIndex: 999 })
              .to(realCard, { y: -50, scale: 1.2, duration: 0.3, ease: "back.out(2)" })
              .to(realCard, { x: 0, y: -20, rotateZ: 0, rotateY: 180, scale: 1.4, duration: 0.5, delay: 0.2, ease: "power3.out", onComplete: () => finishWithDelay(winIdx) });

        } else if (pattern === 2) { // 3. 迷いウェーブ
            for (let i = 0; i < total * 2 + winIdx + 1; i++) {
                const target = cards[i % total];
                tl.to(target, { y: -15, duration: 0.08, ease: "power1.out" })
                  .to(target, { y: 0, duration: 0.08, ease: "power1.in" });
            }
            tl.set(realCard, { zIndex: 999 })
              .to(realCard, { y: -50, scale: 1.2, duration: 0.3, ease: "power3.out" })
              .to(realCard, { x: 0, y: -20, rotateZ: 0, rotateY: 180, scale: 1.4, duration: 0.6, delay: 0.1, ease: "back.out(1.2)", onComplete: () => finishWithDelay(winIdx) });

        } else if (pattern === 3) { // 4. ハズレ脱落
            tl.to({}, { duration: 0.5 });
            if (others.length > 0) {
                tl.to(others, { y: 150, opacity: 0, rotateZ: () => (Math.random()-0.5)*40, duration: 0.6, ease: "power2.in", stagger: 0.05 });
            }
            tl.set(realCard, { zIndex: 999 })
              .to(realCard, { x: 0, y: -20, rotateZ: 0, rotateY: 180, scale: 1.4, duration: 0.8, ease: "elastic.out(1, 0.6)", onComplete: () => finishWithDelay(winIdx) });

        } else if (pattern === 4) { // 5. イリュージョン
            tl.to({}, { duration: 0.2 })
              .to(cards, { x: () => (Math.random() - 0.5) * 200, y: () => (Math.random() - 0.5) * 200, rotateZ: () => (Math.random() - 0.5) * 90, duration: 0.5, ease: "power2.out" });
            if (others.length > 0) {
                tl.to(others, { opacity: 0, scale: 0.5, duration: 0.4, stagger: 0.05, ease: "power2.in" });
            }
            tl.set(realCard, { zIndex: 999 })
              .to(realCard, { x: 0, y: -20, rotateZ: 0, rotateY: 180, scale: 1.4, duration: 0.6, ease: "back.out(1.5)", onComplete: () => finishWithDelay(winIdx) });

        } else if (pattern === 5) { // 6. ファイナル・デッドヒート
            const pureOthers = others.filter(c => c !== dummyCard);
            tl.to({}, { duration: 0.2 });
            if (pureOthers.length > 0) {
                tl.to(pureOthers, { opacity: 0, scale: 0, duration: 0.4, ease: "back.in(1.5)" });
            }
            tl.set([dummyCard, realCard], { zIndex: 999 })
              .to([dummyCard, realCard], { x: (i) => (i === 0 ? -60 : 60), y: -30, scale: 1.2, rotateZ: 0, duration: 0.6, ease: "power2.out" })
              .to([dummyCard, realCard], { y: "+=10", duration: 0.05, yoyo: true, repeat: 9 }) 
              .to(dummyCard, { y: 200, opacity: 0, rotateZ: 45, duration: 0.5, ease: "power3.in" }) 
              .to(realCard, { x: 0, y: -20, scale: 1.4, rotateY: 180, duration: 0.6, ease: "back.out(1.5)", onComplete: () => finishWithDelay(winIdx) });

        } else if (pattern === 6) { // 7. スライディング・エリミネーション
            tl.to(cards, { x: (i) => (i - total/2 + 0.5) * Math.min(60, 300/total), y: 0, rotateZ: 0, duration: 0.5, ease: "power2.out" });
            if (others.length > 0) {
                const shuffledOthers = gsap.utils.shuffle(others.slice());
                tl.to(shuffledOthers, { y: -150, opacity: 0, rotateZ: () => (Math.random()-0.5)*180, duration: 0.3, stagger: 0.1, ease: "back.in(2)" });
            }
            tl.set(realCard, { zIndex: 999 })
              .to(realCard, { x: 0, y: -20, scale: 1.4, rotateY: 180, duration: 0.6, ease: "back.out(1.5)", onComplete: () => finishWithDelay(winIdx) });

        } else if (pattern === 7) { // 8. タワー・ドロー
            tl.to(cards, { x: 0, y: (i) => -i * 2, rotateZ: () => (Math.random()-0.5)*10, duration: 0.6, ease: "back.out(1.2)" })
              .set(realCard, { zIndex: 999 }) 
              .to(realCard, { y: -80, scale: 1.2, duration: 0.4, ease: "power2.out", delay: 0.3 })
              .to(realCard, { x: 0, y: -20, rotateZ: 0, rotateY: 180, scale: 1.4, duration: 0.6, ease: "back.out(1.5)", onComplete: () => finishWithDelay(winIdx) });

        } else if (pattern === 8) { // 9. スポットライト
            if (others.length > 0) {
                tl.to(others, { opacity: 0.3, scale: 0.8, duration: 0.5, ease: "power2.inOut" });
            }
            tl.set(realCard, { zIndex: 999 })
              .to(realCard, { y: -40, scale: 1.2, boxShadow: "0 0 30px #d4af37", duration: 0.5, ease: "back.out(1.5)" })
              .to(realCard, { x: 0, y: -20, rotateZ: 0, rotateY: 180, scale: 1.4, duration: 0.6, ease: "power3.out", delay: 0.2, onComplete: () => finishWithDelay(winIdx) });

        } else if (pattern === 9) { // 10. クイック・アセンブル
            tl.to(cards, { x: 0, y: 0, rotateZ: 0, scale: 0.1, opacity: 0, duration: 0.5, ease: "power2.in" })
              .set(realCard, { zIndex: 999, opacity: 1, scale: 0.1 })
              .to(realCard, { x: 0, y: -20, rotateY: 180, scale: 1.4, duration: 0.8, ease: "elastic.out(1, 0.5)", onComplete: () => finishWithDelay(winIdx) });
        }
    };

    const spin = () => {
        // 編集中にスピンが押されたら強制的にフォーカスを外す
        if (document.activeElement && document.activeElement.classList.contains('item-text')) {
            document.activeElement.blur();
        }

        if (state.isSpinning || state.items.length === 0) return;
        state.isSpinning = true;
        
        ui.btnSpin.textContent = 'LOCKED';
        ui.btnSpin.classList.add('spinning');
        ui.itemInput.disabled = true;
        ui.itemInput.style.opacity = '0.5';
        ui.btnAdd.disabled = true;
        ui.btnAdd.style.opacity = '0.5';
        ui.poolList.classList.add('disabled');

        if (state.currentMode === 'roulette') {
            startRoulettePhysics();
        } else {
            const winIdx = Math.floor(Math.random() * state.items.length);
            if (state.currentMode === 'slot') animateSlot(winIdx);
            else if (state.currentMode === 'card') animateCard(winIdx);
        }
    };

    const finishWithDelay = (winIdx) => {
        setTimeout(() => showResult(winIdx), 1200);
    };

    const showResult = (winIdx) => {
        const labels = {
            'roulette': 'WINNING POCKET',
            'slot': 'JACKPOT',
            'card': 'DRAW RESULT'
        };
        ui.resultLabel.textContent = labels[state.currentMode];
        ui.resultNum.textContent = `No.${winIdx + 1}`;
        ui.resultText.textContent = state.items[winIdx];
        
        ui.overlay.style.pointerEvents = 'auto';
        gsap.to(ui.overlay, { opacity: 1, duration: 0.4 });
        gsap.fromTo(ui.resultBox, { scale: 0.5, y: 50 }, { scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' });
    };

    const hideResult = () => {
        gsap.to(ui.overlay, { opacity: 0, duration: 0.3, onComplete: () => {
            ui.overlay.style.pointerEvents = 'none';
            state.isSpinning = false;
            
            ui.btnSpin.textContent = 'START GAME';
            ui.btnSpin.classList.remove('spinning');
            ui.itemInput.disabled = false;
            ui.itemInput.style.opacity = '1';
            ui.btnAdd.disabled = false;
            ui.btnAdd.style.opacity = '1';
            ui.poolList.classList.remove('disabled');
            
            gsap.set('.slot-display', { boxShadow: 'inset 0 15px 25px rgba(0,0,0,0.9)' });
            
            if (state.currentMode === 'card') buildCards();
        }});
    };

    const bindEvents = () => {
        ui.modeBtns.forEach(btn => btn.addEventListener('click', (e) => {
            if (!state.isSpinning) switchMode(e.target.dataset.mode);
        }));
        ui.btnSpin.addEventListener('click', spin);
        ui.btnClose.addEventListener('click', hideResult);

        ui.btnAdd.addEventListener('click', () => {
            if (state.isSpinning) return;
            const val = ui.itemInput.value.trim();
            if (val && state.items.length < 100) {
                state.items.push(val);
                ui.itemInput.value = '';
                renderLists();
            }
        });
        ui.itemInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') ui.btnAdd.click(); });
        
        // リストのクリックイベント（削除と編集）
        ui.poolList.addEventListener('click', (e) => {
            if (state.isSpinning) return;
            
            if (e.target.classList.contains('btn-delete')) {
                state.items.splice(e.target.dataset.idx, 1);
                renderLists();
            } else if (e.target.classList.contains('item-text')) {
                // 直接編集モードへ
                const el = e.target;
                el.contentEditable = true;
                el.focus();
                
                // テキストを全選択
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(el);
                selection.removeAllRanges();
                selection.addRange(range);
                
                // フォーカスが外れたら保存
                el.onblur = () => {
                    el.contentEditable = false;
                    let newVal = el.textContent.trim();
                    const idx = el.dataset.idx;
                    if (newVal) {
                        if (newVal.length > 30) newVal = newVal.substring(0, 30);
                        state.items[idx] = newVal;
                    } else {
                        state.items.splice(idx, 1);
                    }
                    renderLists();
                };
                
                // エンターキーで保存
                el.onkeydown = (ev) => {
                    if (ev.key === 'Enter') {
                        ev.preventDefault();
                        el.blur();
                    }
                };
            }
        });
    };

    init();
})();