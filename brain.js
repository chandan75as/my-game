// ==========================================
// 🧠 BRAIN.JS - HYBRID ENGINE (PRODUCTION READY)
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. Prevent Mobile Zooming
document.addEventListener('gesturestart', e => e.preventDefault());

// ==========================================
// 🖼️ ANTI-BLACK SCREEN (IMAGE PRELOADER)
// ==========================================
const imagesToCache = ['background.jpg', 'logo.jpg', 'farm.png', 'animalfarm.png', 'storage.png', 'market.png', 'house.png'];
imagesToCache.forEach(src => {
    const img = new Image();
    img.src = src;
});

// ==========================================
// 🔥 FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAFpOWJlCYTvlhVijnyOPeVn0wCw7Ev5tI",
    authDomain: "my-cozy-farm.firebaseapp.com",
    databaseURL: "https://my-cozy-farm-default-rtdb.firebaseio.com",
    projectId: "my-cozy-farm",
    storageBucket: "my-cozy-farm.firebasestorage.app",
    messagingSenderId: "680824081334",
    appId: "1:680824081334:web:94e41cc91d41ef862d4f17",
    measurementId: "G-XQN1JNEW1E"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Global Variables
let PLAYER_ID = null; 
window.GameData = null; 
let needsCloudSync = false; 

// ==========================================
// 💾 DATA MANAGEMENT (Hybrid System)
// ==========================================
function getDefaultData(uid) {
    return {
        playerName: "Farmer",
        playerId: uid,
        vipLevel: 1,
        level: 1,
        xp: 0,
        maxXp: 100,
        coins: 2000, 
        gems: 1500,
        storage: 0,
        maxStorage: 15, 
        equippedTool: { type: null, id: null, icon: '✋', name: 'None' },
        stats: { cropsHarvested: 0, totalEarnings: 0, animalsOwned: 0, daysPlayed: 1 },
        inventory: { 'seed-wheat': 5, 'seed-tomato': 2, 'seed-corn': 0, 'wheat': 1, 'tomato': 0, 'corn': 0 },
        marketInventory: {}, 
        farmPlots: [
            { id: 1, state: 'raw', seedId: null, readyAt: null },
            { id: 2, state: 'raw', seedId: null, readyAt: null },
            { id: 3, state: 'raw', seedId: null, readyAt: null }
        ],
        lastSaved: Date.now()
    };
}

function calculateTotalStorage(inv) {
    let total = 0;
    for (let key in inv) { if (!key.includes('seed')) total += inv[key]; }
    return total;
}

// 🚀 SMART LOAD: Instant Local Load + Background Cloud Check
async function loadGameData() {
    let localKey = `myCozyFarmData_${PLAYER_ID}`;
    let localSaved = localStorage.getItem(localKey);
    let localData = localSaved ? JSON.parse(localSaved) : null;

    if (localData) {
        window.GameData = localData;
        window.updateGlobalUI(); 
    }

    try {
        const dbRef = ref(db);
        get(child(dbRef, `players/${PLAYER_ID}`)).then((snapshot) => {
            if (snapshot.exists()) {
                let cloudData = snapshot.val();
                
                // If Cloud is newer
                if (!localData || (cloudData.lastSaved && cloudData.lastSaved > (localData.lastSaved || 0))) {
                    window.GameData = cloudData;
                    saveToLocalOnly(); 
                    window.updateGlobalUI();
                    if(document.getElementById('main-farm') && typeof window.renderPlots === 'function') {
                        window.renderPlots();
                    }
                } 
                // If Local is newer
                else if (localData && localData.lastSaved > (cloudData.lastSaved || 0)) {
                    needsCloudSync = true;
                }
            } else if (!localData) {
                // New User
                window.GameData = getDefaultData(PLAYER_ID);
                saveToLocalOnly();
                needsCloudSync = true;
            }
        });
    } catch (error) {
        console.log("Playing Offline - No Internet");
        if (!localData) window.GameData = getDefaultData(PLAYER_ID);
    }

    return window.GameData;
}

function saveToLocalOnly() {
    if(!window.GameData) return;
    window.GameData.storage = calculateTotalStorage(window.GameData.inventory);
    window.GameData.lastSaved = Date.now(); 
    localStorage.setItem(`myCozyFarmData_${PLAYER_ID}`, JSON.stringify(window.GameData));
}

window.saveGameData = function() {
    saveToLocalOnly();
    needsCloudSync = true;
    
    // Instant sync trigger
    set(ref(db, `players/${PLAYER_ID}`), window.GameData).catch(()=>console.log("Sync queued"));
};

// ⏱️ BACKGROUND FIREBASE SYNC (Every 30 seconds)
setInterval(() => {
    if (needsCloudSync && window.GameData && PLAYER_ID) {
        set(ref(db, `players/${PLAYER_ID}`), window.GameData).then(() => {
            needsCloudSync = false;
        }).catch(err => console.log("Cloud sync failed, will retry later.", err));
    }
}, 30000); 

window.addEventListener('beforeunload', () => {
    if (needsCloudSync && window.GameData && PLAYER_ID) {
        set(ref(db, `players/${PLAYER_ID}`), window.GameData);
    }
});

// ==========================================
// 🔄 GLOBAL UI UPDATER 
// ==========================================
window.updateGlobalUI = function() {
    if(!window.GameData) return;
    const coinFarm = document.getElementById('coin-ui');
    const coinMarket = document.getElementById('coin-display'); 
    const gemFarm = document.getElementById('gem-ui');
    const gemMarket = document.getElementById('gem-display');
    const nameUI = document.getElementById('player-name');

    if (coinFarm) coinFarm.innerText = coinFarm.tagName === 'SPAN' ? window.GameData.coins : `🪙 ${window.GameData.coins}`;
    if (coinMarket) coinMarket.innerText = `🪙 ${window.GameData.coins}`;
    if (gemFarm) gemFarm.innerText = `💎 ${window.GameData.gems}`;
    if (gemMarket) gemMarket.innerText = `💎 ${window.GameData.gems}`;
    if (nameUI) nameUI.innerText = window.GameData.playerName;

    const storageTxt = document.getElementById('storage-txt');
    const storageBar = document.getElementById('storage-bar');
    if(storageTxt) storageTxt.innerText = `Storage: ${window.GameData.storage} / ${window.GameData.maxStorage}`;
    if(storageBar) storageBar.style.width = `${(window.GameData.storage / window.GameData.maxStorage) * 100}%`;
};

// ==========================================
// 🔔 GLOBAL CUSTOM ALERT SYSTEM
// ==========================================
window.customAlert = function(title, msg, type = 'normal') {
    const titleEl = document.getElementById('alert-title');
    const msgEl = document.getElementById('alert-msg');
    const box = document.getElementById('custom-alert-box');
    const overlay = document.getElementById('custom-alert-overlay');

    if(overlay && box) {
        titleEl.innerText = title;
        msgEl.innerText = msg;
        box.className = `alert-box ${type}`;
        overlay.classList.add('show');
    } else {
        alert(title + ": " + msg); 
    }
}
window.closeAlert = function() {
    const overlay = document.getElementById('custom-alert-overlay');
    if(overlay) overlay.classList.remove('show');
}

// ==========================================
// 🚀 PAGE ROUTER (WITH AUTH CHECK)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            PLAYER_ID = user.uid; // Set genuine unique ID from Google Auth
            await loadGameData(); 
            window.updateGlobalUI();

            if (document.getElementById('main-farm')) initFarmLogic();
            else if (document.getElementById('inventory-grid')) initStorageLogic();
            else if (document.getElementById('market-grid')) initMarketLogic();
            else if (document.getElementById('profile-name')) initProfileLogic();
        } else {
            // Not logged in -> Redirect to login page (Update 'index.html' if your login page has a different name)
            if (!window.location.href.includes('index.html')) {
                window.location.href = "index.html"; 
            }
        }
    });
});

// ==========================================
// 🚜 1. FARM PAGE LOGIC 
// ==========================================
function initFarmLogic() {
    window.farmPlots = window.GameData.farmPlots;

    const DB = {
        'Tools': [
            { id: 'tool-hoe', type: 'tool', icon: '🪏', name: 'Hoe (Dig)', cost: 0 },
            { id: 'tool-water', type: 'tool', icon: '🚿', name: 'Water Can', cost: 0 },
            { id: 'tool-harvest', type: 'tool', icon: '🧺', name: 'Sickle', cost: 0 }
        ],
        'Fertilizers': [
            { id: 'fert-1', type: 'fertilizer', icon: '💩', name: 'Manure', cost: 2, cur: 'coin', speed: 5 },
            { id: 'fert-2', type: 'fertilizer', icon: '✨', name: 'InstaGro', cost: 1, cur: 'gem', speed: 9999 }
        ],
        'Seeds': [
            { id: 'seed-wheat', type: 'seed', icon: '🌾', name: 'Wheat', time: 10 },
            { id: 'seed-corn', type: 'seed', icon: '🌽', name: 'Corn', time: 20 },
            { id: 'seed-tomato', type: 'seed', icon: '🍅', name: 'Tomato', time: 30 }
        ]
    };

    document.getElementById('active-tool-display').innerHTML = `${window.GameData.equippedTool.icon} ${window.GameData.equippedTool.name}`;

    function updateDynamicButton() {
        const btn = document.getElementById('dynamic-action-btn');
        if(!btn) return;
        let tool = window.GameData.equippedTool;

        if (tool.type === null) {
            btn.innerHTML = `🌱 Select Seed`; btn.onclick = () => window.openModal('Seeds'); btn.className = 'btn-3d btn-gold';
        } else if (tool.id === 'tool-hoe') {
            btn.innerHTML = `🪏 Dig All`; btn.onclick = window.digAll; btn.className = 'btn-3d btn-blue';
        } else if (tool.id === 'tool-water') {
            btn.innerHTML = `🚿 Water All`; btn.onclick = window.waterAll; btn.className = 'btn-3d btn-blue';
        } else if (tool.id === 'tool-harvest') {
            btn.innerHTML = `🧺 Harvest All`; btn.onclick = window.harvestAll; btn.className = 'btn-3d btn-green';
        } else if (tool.type === 'seed') {
            btn.innerHTML = `🌱 Plant All ${tool.name}`; btn.onclick = window.plantAll; btn.className = 'btn-3d btn-gold';
        } else if (tool.type === 'fertilizer') {
            btn.innerHTML = `✨ Fertilize All`; btn.onclick = window.fertilizeAll; btn.className = 'btn-3d btn-purple'; 
        }
    }

    window.renderPlots = function() {
        const grid = document.getElementById('main-farm');
        if (!grid) return;
        grid.innerHTML = '';

        window.farmPlots.forEach((plot, index) => {
            let html = '';
            if(plot.state === 'raw') html = `<div class="plot raw" onclick="window.clickPlot(${index})"><div class="plot-icon"></div><div class="plot-tag">Raw Land</div></div>`;
            else if(plot.state === 'dug') html = `<div class="plot dug" onclick="window.clickPlot(${index})"><div class="plot-icon">🕳️</div><div class="plot-tag">Dug</div></div>`;
            else if(plot.state === 'planted') html = `<div class="plot planted" onclick="window.clickPlot(${index})"><div class="plot-icon">🌱</div><div class="plot-tag">Needs 💦</div></div>`;
            else if(plot.state === 'watered') {
                let timeLeft = plot.readyAt ? Math.ceil((plot.readyAt - Date.now()) / 1000) : 0;
                if(timeLeft < 0) timeLeft = 0;
                html = `<div class="plot watered" onclick="window.clickPlot(${index})"><div class="plot-icon">🌿</div><div class="plot-tag">${timeLeft}s</div></div>`;
            }
            else if(plot.state === 'ready') {
                let seedIcon = DB.Seeds.find(s => s.id === plot.seedId).icon;
                html = `<div class="plot ready" onclick="window.clickPlot(${index})"><div class="plot-icon">${seedIcon}</div><div class="plot-tag">Ready!</div></div>`;
            }
            grid.innerHTML += html;
        });

        let plotsInCurrentRow = window.farmPlots.length % 3; 
        if (plotsInCurrentRow !== 0) {
            let coinCost = plotsInCurrentRow === 1 ? 500 : 1000;
            grid.innerHTML += `<div class="plot add-plot" onclick="window.buyPlot(${coinCost})"><div class="plot-icon">➕</div><div class="plot-tag" style="color:#FFD700; border-color:#FFD700">${coinCost}🪙</div></div>`;
            let slotsToLock = 3 - plotsInCurrentRow - 1; 
            for (let i = 0; i < slotsToLock; i++) grid.innerHTML += `<div class="plot empty-slot"></div>`;
        } else {
            let rowsAdded = Math.floor(window.farmPlots.length / 3) - 1;
            let gemCost = rowsAdded >= 6 ? 30 : (rowsAdded >= 3 ? 20 : 10);

            grid.innerHTML += `
                <div class="plot empty-slot"></div><div class="plot empty-slot"></div><div class="plot empty-slot"></div>
                <div class="plot add-plot" style="grid-column: span 3; border-color: #00E5FF; background: rgba(0,0,0,0.6);" onclick="window.buyRow(${gemCost})">
                    <div class="plot-icon" style="color: #00E5FF;">➕</div><div class="plot-tag" style="color:#00E5FF; border-color:#00E5FF">Unlock Row: ${gemCost}💎</div>
                </div>
            `;
        }
    }

    window.openModal = function(category) {
        document.getElementById('modal-title').innerText = category;
        const content = document.getElementById('modal-content');
        content.innerHTML = ''; 

        DB[category].forEach(item => {
            let costText = ''; let costClass = '';
            if(category === 'Seeds') {
                let qty = window.GameData.inventory[item.id] || 0;
                costText = `${qty}x 🎒`; costClass = 'price-bag';
            } else if(category === 'Fertilizers') {
                costText = `${item.cost}${item.cur === 'coin' ? '🪙' : '💎'}`; costClass = item.cur === 'coin' ? 'price-coin' : 'price-gem';
            } else { costText = 'Free'; }
            
            content.innerHTML += `
                <div class="popup-item" onclick="window.selectItem('${item.id}', '${category}')">
                    <div class="popup-icon">${item.icon}</div><div class="popup-name">${item.name}</div><div class="popup-price ${costClass}">${costText}</div>
                </div>`;
        });
        document.getElementById('item-modal').classList.add('show');
    };

    window.closeModal = function() { document.getElementById('item-modal').classList.remove('show'); };

    window.selectItem = function(id, category) {
        let item = DB[category].find(i => i.id === id);
        window.GameData.equippedTool = { type: item.type, id: item.id, icon: item.icon, name: item.name };
        window.saveGameData(); 
        document.getElementById('active-tool-display').innerHTML = `${window.GameData.equippedTool.icon} ${window.GameData.equippedTool.name}`;
        updateDynamicButton();
        window.closeModal();
    };

    window.clickPlot = function(index) {
        let plot = window.farmPlots[index];
        let tool = window.GameData.equippedTool;

        if (tool.type === null) { window.customAlert("Select Tool", "Select a tool or seed!", "error"); return; }

        if (tool.id === 'tool-hoe') {
            if (plot.state === 'raw') { plot.state = 'dug'; window.customAlert("Success!", "Dug a hole!", "success"); }
            else { window.customAlert("Action Failed", "You can only dig Raw Land!", "error"); return; }
        } else if (tool.type === 'seed') {
            if (plot.state === 'dug') {
                if (window.GameData.inventory[tool.id] > 0) {
                    window.GameData.inventory[tool.id]--; plot.state = 'planted'; plot.seedId = tool.id;
                    window.customAlert("Planted!", `Planted ${tool.name}!`, "success");
                } else { window.customAlert("Out of Stock", "Not enough seeds in bag!", "error"); return; }
            } else { window.customAlert("Action Failed", "Must dig a hole (🪏) first!", "error"); return; }
        } else if (tool.id === 'tool-water') {
            if (plot.state === 'planted') {
                plot.state = 'watered';
                let seedInfo = DB.Seeds.find(s => s.id === plot.seedId);
                plot.readyAt = Date.now() + (seedInfo.time * 1000);
                window.customAlert("Watered!", "Watered the crop! 💦", "success");
            } else { window.customAlert("Action Failed", "Only water planted seeds!", "error"); return; }
        } else if (tool.type === 'fertilizer') {
            if (plot.state === 'watered') {
                let fert = DB.Fertilizers.find(f => f.id === tool.id);
                if(fert.cur === 'coin' && window.GameData.coins >= fert.cost) { window.GameData.coins -= fert.cost; }
                else if(fert.cur === 'gem' && window.GameData.gems >= fert.cost) { window.GameData.gems -= fert.cost; }
                else { window.customAlert("Poor!", "Not enough resources!", "error"); return; }
                
                plot.readyAt -= (fert.speed * 1000); 
                if(plot.readyAt <= Date.now()) {
                    plot.state = 'ready';
                    plot.readyAt = null;
                }
                window.customAlert("Applied!", "Fertilizer applied! ✨", "success");
            } else { window.customAlert("Action Failed", "Water crop before fertilizing!", "error"); return; }
        } else if (tool.id === 'tool-harvest') {
            if (plot.state === 'ready') {
                if(window.GameData.storage >= window.GameData.maxStorage) { window.customAlert("Barn Full", "Barn is FULL!", "error"); return; }
                let produceName = DB.Seeds.find(s => s.id === plot.seedId).name.toLowerCase(); 
                
                plot.state = 'raw'; plot.seedId = null; plot.readyAt = null;
                window.GameData.storage++; 
                window.GameData.coins += 5; 
                window.GameData.inventory[produceName] = (window.GameData.inventory[produceName] || 0) + 1; 
                window.GameData.stats.cropsHarvested++;
                window.GameData.stats.totalEarnings += 5;

                window.customAlert("Harvested!", "Harvested successfully!", "success");
            } else { window.customAlert("Hold On", "Crop is not ready yet!", "error"); return; }
        }
        window.saveGameData(); 
        window.updateGlobalUI(); 
        window.renderPlots();
    };

    window.digAll = function() {
        let count = 0;
        window.farmPlots.forEach(plot => { if (plot.state === 'raw') { plot.state = 'dug'; count++; } });
        if(count > 0) { window.customAlert("Digging Done", `Dug ${count} holes!`, "success"); window.saveGameData(); window.renderPlots(); }
        else window.customAlert("Oops", "No raw land to dig!", "error");
    };

    window.plantAll = function() {
        let count = 0; let tool = window.GameData.equippedTool;
        window.farmPlots.forEach(plot => {
            if(plot.state === 'dug' && window.GameData.inventory[tool.id] > 0) {
                window.GameData.inventory[tool.id]--; plot.state = 'planted'; plot.seedId = tool.id; count++;
            }
        });
        if(count > 0) { window.customAlert("Planting Done", `Planted ${count} ${tool.name}!`, "success"); window.saveGameData(); window.renderPlots(); }
        else window.customAlert("Oops", "No dug holes or out of seeds!", "error");
    };

    window.waterAll = function() {
        let count = 0;
        window.farmPlots.forEach(plot => {
            if (plot.state === 'planted') {
                plot.state = 'watered';
                let seedInfo = DB.Seeds.find(s => s.id === plot.seedId); 
                plot.readyAt = Date.now() + (seedInfo.time * 1000); 
                count++;
            }
        });
        if(count > 0) { window.customAlert("Watering Done", `Watered ${count} plots!`, "success"); window.saveGameData(); window.renderPlots(); }
        else window.customAlert("Oops", "No planted seeds to water!", "error");
    };

    window.fertilizeAll = function() {
        let tool = window.GameData.equippedTool;
        let fert = DB.Fertilizers.find(f => f.id === tool.id);
        let count = 0;
        window.farmPlots.forEach(plot => {
            if(plot.state === 'watered') {
                if(fert.cur === 'coin' && window.GameData.coins >= fert.cost) { 
                    window.GameData.coins -= fert.cost; 
                    plot.readyAt -= (fert.speed * 1000); count++; 
                }
                else if(fert.cur === 'gem' && window.GameData.gems >= fert.cost) { 
                    window.GameData.gems -= fert.cost; 
                    plot.readyAt -= (fert.speed * 1000); count++; 
                }
                if(plot.readyAt <= Date.now()) {
                    plot.state = 'ready';
                    plot.readyAt = null;
                }
            }
        });
        if(count > 0) { window.customAlert("Fertilized", `Fertilized ${count} crops!`, "success"); window.saveGameData(); window.renderPlots(); window.updateGlobalUI();}
        else window.customAlert("Oops", "No watered crops or out of money!", "error");
    };

    window.harvestAll = function() {
        let count = 0;
        window.farmPlots.forEach(plot => {
            if(plot.state === 'ready' && window.GameData.storage < window.GameData.maxStorage) {
                let produceName = DB.Seeds.find(s => s.id === plot.seedId).name.toLowerCase();
                plot.state = 'raw'; plot.seedId = null; plot.readyAt = null;
                window.GameData.storage++; 
                window.GameData.coins += 5; 
                window.GameData.inventory[produceName] = (window.GameData.inventory[produceName] || 0) + 1;
                window.GameData.stats.cropsHarvested++;
                window.GameData.stats.totalEarnings += 5;
                count++;
            }
        });
        if(count > 0) { window.customAlert("Harvest Done", `Harvested ${count} crops!`, "success"); window.saveGameData(); window.renderPlots(); window.updateGlobalUI(); }
        else window.customAlert("Oops", "No crops ready or Barn is full!", "error");
    };

    window.upgradeBarn = function() {
        if (window.GameData.coins >= 1000) {
            window.GameData.coins -= 1000; window.GameData.maxStorage += 10;
            window.customAlert("Upgraded!", "Barn Upgraded! (+10 Capacity)", "success");
        } else if (window.GameData.gems >= 10) {
            window.GameData.gems -= 10; window.GameData.maxStorage += 10;
            window.customAlert("Upgraded!", "Barn Upgraded! (+10 Capacity)", "success");
        } else {
            window.customAlert("Not Enough Funds", "Need 1000🪙 or 10💎 to upgrade!", "error"); return;
        }
        window.saveGameData(); window.updateGlobalUI();
    };

    window.buyRow = function(cost) {
        if (window.GameData.gems >= cost) {
            window.GameData.gems -= cost; window.buyPlot(200); 
            setTimeout(() => document.querySelector('.sec-box').scrollTo({ top: 9999, behavior: 'smooth' }), 50);
        } else { window.customAlert("Oops!", "Not enough Gems to unlock a new row!", "error"); }
    };

    window.buyPlot = function(cost) {
        if (window.GameData.coins >= cost) {
            window.GameData.coins -= cost;
            window.farmPlots.push({ id: window.farmPlots.length + 1, state: 'raw', seedId: null, readyAt: null });
            window.customAlert("Unlocked!", "New plot unlocked successfully!", "success");
            window.saveGameData(); window.renderPlots(); window.updateGlobalUI();
        } else { window.customAlert("Not Enough Coins", `Need ${cost}🪙 for this slot!`, "error"); }
    };

    // Auto Crop Growth Interval
    setInterval(() => {
        let needsRender = false;
        let cropFinished = false;
        window.farmPlots.forEach(plot => {
            if (plot.state === 'watered' && plot.readyAt) {
                let remainingTime = Math.ceil((plot.readyAt - Date.now()) / 1000);
                needsRender = true; 
                
                if (remainingTime <= 0) {
                    plot.state = 'ready';
                    plot.readyAt = null;
                    cropFinished = true; 
                }
            }
        });
        if(needsRender) window.renderPlots();
        if(cropFinished) window.saveGameData(); 
    }, 1000);

    // Initial check incase crops grew while offline
    let offileGrew = false;
    window.farmPlots.forEach(plot => {
        if (plot.state === 'watered' && plot.readyAt && Date.now() >= plot.readyAt) {
            plot.state = 'ready'; plot.readyAt = null; offileGrew = true;
        }
    });
    if(offileGrew) window.saveGameData();

    window.renderPlots();
    updateDynamicButton();
}

// ==========================================
// 🎒 2. STORAGE PAGE LOGIC 
// ==========================================
function initStorageLogic() {
    let currentCategory = 'crops';
    let selectedItemId = null;
    let selectedStackQty = 0;
    let transferQty = 1;
    const STACK_LIMIT = 25; 

    const ITEM_DB = {
        'wheat': { name: 'Wheat', icon: '🌾', cat: 'crops' },
        'tomato': { name: 'Tomato', icon: '🍅', cat: 'crops' },
        'corn': { name: 'Corn', icon: '🌽', cat: 'crops' },
        'milk': { name: 'Cow Milk', icon: '🥛', cat: 'goods' },
        'egg': { name: 'Fresh Egg', icon: '🥚', cat: 'goods' },
        'seed-wheat': { name: 'Wheat Seed', icon: '🌱', cat: 'seeds' },
        'seed-corn': { name: 'Corn Seed', icon: '🌽', cat: 'seeds' },
        'seed-tomato': { name: 'Tomato Seed', icon: '🍅', cat: 'seeds' }
    };

    function renderInventory() {
        const grid = document.getElementById('inventory-grid');
        if(!grid) return;
        grid.innerHTML = ''; 

        for (let id in ITEM_DB) {
            let item = ITEM_DB[id];
            
            if (item.cat === currentCategory) {
                let totalQty = window.GameData.inventory[id] || 0;
                
                if (totalQty === 0) {
                    grid.innerHTML += `
                        <div class="item-card empty-card" onclick="window.openDetails('${id}', 0)">
                            <div class="item-qty">x0</div>
                            <div class="item-icon">${item.icon}</div>
                            <div class="item-name">${item.name}</div>
                        </div>`;
                } else {
                    let fullStacks = Math.floor(totalQty / STACK_LIMIT);
                    let remainder = totalQty % STACK_LIMIT;

                    for(let i = 0; i < fullStacks; i++) {
                        grid.innerHTML += createCardHTML(id, item, STACK_LIMIT, true);
                    }
                    if (remainder > 0) {
                        grid.innerHTML += createCardHTML(id, item, remainder, false);
                    }
                }
            }
        }
    }

    function createCardHTML(id, item, qty, isFull) {
        let badgeClass = isFull ? 'item-qty stack-full' : 'item-qty';
        return `
            <div class="item-card" onclick="window.openDetails('${id}', ${qty})">
                <div class="${badgeClass}">x${qty}</div>
                <div class="item-icon">${item.icon}</div>
                <div class="item-name">${item.name}</div>
            </div>`;
    }

    window.openDetails = function(id, stackQty) {
        let item = ITEM_DB[id];
        selectedItemId = id;
        selectedStackQty = stackQty;
        transferQty = 1; 
        
        document.getElementById('modal-title').innerText = item.name;
        document.getElementById('modal-icon').innerText = item.icon;
        document.getElementById('modal-qty').innerText = `Selected Slot Qty: ${stackQty}`;
        
        let actionsContainer = document.getElementById('modal-actions-container');
        
        if(stackQty > 0) {
            actionsContainer.innerHTML = `
                <div class="qty-selector">
                    <div class="qty-btn" onclick="window.changeQty(-1)">-</div>
                    <div class="qty-display" id="transfer-qty-display">${transferQty}</div>
                    <div class="qty-btn" onclick="window.changeQty(1)">+</div>
                </div>
                <div class="modal-actions">
                    <button class="btn-3d btn-transfer" onclick="window.confirmTransfer()">🚚 Send to Market (Fee: 5🪙)</button>
                    <button class="btn-3d btn-use" onclick="window.equipToFarm('${id}')">🚜 Equip & Go to Farm</button>
                </div>
            `;
        } else {
            actionsContainer.innerHTML = `
                <div class="modal-actions">
                    <button class="btn-3d btn-use" onclick="window.location.href='market.html'">Go Buy in Market</button>
                </div>
            `;
        }
        document.getElementById('item-modal').classList.add('show');
    };

    window.changeQty = function(change) {
        transferQty += change;
        if(transferQty < 1) transferQty = 1;
        if(transferQty > selectedStackQty) transferQty = selectedStackQty;
        document.getElementById('transfer-qty-display').innerText = transferQty;
    };

    window.confirmTransfer = function() {
        if (window.GameData.coins < 5) {
            window.customAlert("Not Enough Coins!", "You need 5🪙 to pay the delivery truck fee.", "error");
            return;
        }

        window.GameData.coins -= 5;
        window.GameData.inventory[selectedItemId] -= transferQty;
        
        if (!window.GameData.marketInventory) window.GameData.marketInventory = {};
        window.GameData.marketInventory[selectedItemId] = (window.GameData.marketInventory[selectedItemId] || 0) + transferQty;
        
        window.saveGameData();
        window.updateGlobalUI();
        renderInventory();
        document.getElementById('item-modal').classList.remove('show');
        
        window.customAlert("Truck Dispatched! 🚚", `Transferred ${transferQty}x ${ITEM_DB[selectedItemId].name} to Market!`, "success");
    };

    window.equipToFarm = function(id) {
        let item = ITEM_DB[id];
        let toolType = item.cat === 'seeds' ? 'seed' : 'item';
        window.GameData.equippedTool = { type: toolType, id: id, icon: item.icon, name: item.name };
        window.saveGameData();
        window.location.href = 'farm.html';
    };

    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            currentCategory = this.getAttribute('data-cat');
            renderInventory();
        });
    });

    renderInventory();
}

// ==========================================
// 🏪 3. MARKET PAGE LOGIC (SELL ONLY)
// ==========================================
function initMarketLogic() {
    let currentCategory = 'crops';

    const ITEM_DB = {
        'wheat': { name: 'Wheat', icon: '🌾', cat: 'crops', price: 5 },
        'tomato': { name: 'Tomato', icon: '🍅', cat: 'crops', price: 12 },
        'corn': { name: 'Corn', icon: '🌽', cat: 'crops', price: 8 },
        'milk': { name: 'Cow Milk', icon: '🥛', cat: 'goods', price: 25 },
        'egg': { name: 'Fresh Egg', icon: '🥚', cat: 'goods', price: 10 },
        'rusty-gear': { name: 'Rusty Gear', icon: '⚙️', cat: 'equipment', price: 50 },
        'magic-crystal': { name: 'Magic Crystal', icon: '🔮', cat: 'equipment', price: 250 },
        'tractor-part': { name: 'Tractor Engine', icon: '🚜', cat: 'equipment', price: 1000 }
    };

    function renderMarket() {
        const grid = document.getElementById('market-grid');
        if(!grid) return;
        grid.innerHTML = '';

        let hasItems = false;
        if(!window.GameData.marketInventory) window.GameData.marketInventory = {};

        for (let id in window.GameData.marketInventory) {
            let qty = window.GameData.marketInventory[id];
            
            if (qty > 0 && ITEM_DB[id] && ITEM_DB[id].cat === currentCategory) {
                hasItems = true;
                let item = ITEM_DB[id];
                let totalProfit = item.price * qty;

                grid.innerHTML += `
                    <div class="item-card">
                        <div class="item-qty">x${qty}</div>
                        <div class="item-icon">${item.icon}</div>
                        <div class="item-name">${item.name}</div>
                        <button class="btn-3d btn-sell-one" onclick="window.sellMarketItem('${id}', 1, ${item.price})">Sell 1x (🪙${item.price})</button>
                        <button class="btn-3d btn-sell-all" onclick="window.sellMarketItem('${id}', ${qty}, ${totalProfit})">Sell All (🪙${totalProfit})</button>
                    </div>
                `;
            }
        }

        if (!hasItems) {
            grid.innerHTML = `
                <div style="grid-column: span 2; text-align:center; color:#FFECB3; padding: 20px; font-weight:bold; border: 2px dashed #4E342E; border-radius: 12px; background: rgba(0,0,0,0.3); margin-top: 20px;">
                    🚚 Your Stall is Empty!<br><br>
                    Go to the Storage Bag and transfer items to the Market to sell them here.
                </div>
            `;
        }
    }

    window.sellMarketItem = function(id, qtyToSell, profit) {
        if(window.GameData.marketInventory[id] >= qtyToSell) {
            window.GameData.marketInventory[id] -= qtyToSell;
            window.GameData.coins += profit;
            window.GameData.stats.totalEarnings += profit; 
            
            if(window.GameData.marketInventory[id] === 0) {
                delete window.GameData.marketInventory[id];
            }

            window.saveGameData();
            window.updateGlobalUI();
            renderMarket();

            window.customAlert("Sold! 💰", `You sold ${qtyToSell}x ${ITEM_DB[id].name} for ${profit} Coins!`, "success");
        }
    };

    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() {
            currentCategory = this.getAttribute('data-cat');
            renderMarket();
        });
    });

    renderMarket();
}

// ==========================================
// 👤 4. PROFILE PAGE LOGIC
// ==========================================
function initProfileLogic() {
    if(!window.GameData) return;
    
    document.getElementById('profile-name').innerText = window.GameData.playerName;
    document.getElementById('profile-id').innerText = "ID: " + window.GameData.playerId.substring(0, 8); // Showing short version
    document.getElementById('profile-lvl').innerText = `Lvl ${window.GameData.level}`;
    document.getElementById('profile-vip').innerText = `VIP ${window.GameData.vipLevel || 0}`;
    
    let xp = window.GameData.xp || 0;
    let maxXp = window.GameData.maxXp || 100;
    document.getElementById('profile-xp-text').innerText = `${xp} / ${maxXp}`;
    document.getElementById('profile-xp-bar').style.width = `${(xp / maxXp) * 100}%`;

    let stats = window.GameData.stats || { cropsHarvested: 0, totalEarnings: 0, animalsOwned: 0, daysPlayed: 1 };
    document.getElementById('stat-crops').innerText = stats.cropsHarvested;
    document.getElementById('stat-earnings').innerText = stats.totalEarnings;
    document.getElementById('stat-animals').innerText = stats.animalsOwned;
    document.getElementById('stat-days').innerText = stats.daysPlayed;

    const invGrid = document.getElementById('profile-inventory');
    invGrid.innerHTML = '';
    
    let sortedItems = [];
    const ITEM_ICONS = {
        'wheat': '🌾', 'tomato': '🍅', 'corn': '🌽', 'milk': '🥛', 'egg': '🥚'
    };

    for (let key in window.GameData.inventory) {
        if(!key.includes('seed') && window.GameData.inventory[key] > 0) {
            sortedItems.push({ id: key, qty: window.GameData.inventory[key] });
        }
    }
    
    sortedItems.sort((a, b) => b.qty - a.qty); 

    let itemsToRender = Math.min(sortedItems.length, 8);
    for(let i=0; i<itemsToRender; i++) {
        let item = sortedItems[i];
        let icon = ITEM_ICONS[item.id] || '📦';
        invGrid.innerHTML += `<div class="inv-item">${icon}<div class="inv-qty">${item.qty}</div></div>`;
    }

    if(sortedItems.length === 0) {
        invGrid.innerHTML = `<div style="grid-column: span 4; font-size:11px; color:#FFECB3;">Inventory is empty! Go farm!</div>`;
    }
}
