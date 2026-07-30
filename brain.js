// ==========================================
// 🧠 BRAIN.JS - 1000% PERFECT HYBRID ENGINE
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, set, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 1. Prevent Mobile Zooming
document.addEventListener('gesturestart', e => e.preventDefault());

// ==========================================
// 📚 GLOBAL GAME DATABASE (ONE TRUTH FOR ALL PAGES)
// ==========================================
window.GAME_DB = {
    Tools: [
        { id: 'tool-hoe', type: 'tool', icon: '🪏', name: 'Hoe (Dig)', cost: 0 },
        { id: 'tool-water', type: 'tool', icon: '🚿', name: 'Water Can', cost: 0 },
        { id: 'tool-harvest', type: 'tool', icon: '🧺', name: 'Sickle', cost: 0 }
    ],
    Fertilizers: [
        { id: 'fert-1', type: 'fertilizer', icon: '💩', name: 'Manure', cost: 2, cur: 'coin', speed: 5 },
        { id: 'fert-2', type: 'fertilizer', icon: '✨', name: 'InstaGro', cost: 1, cur: 'gem', speed: 9999 }
    ],
    Seeds: {
        'seed-wheat': { id: 'seed-wheat', type: 'seed', icon: '🌾', name: 'Wheat Seed', time: 10, yields: 'wheat' },
        'seed-corn': { id: 'seed-corn', type: 'seed', icon: '🌽', name: 'Corn Seed', time: 20, yields: 'corn' },
        'seed-tomato': { id: 'seed-tomato', type: 'seed', icon: '🍅', name: 'Tomato Seed', time: 30, yields: 'tomato' }
    },
    Items: {
        // Crops (Yields from seeds)
        'wheat': { name: 'Wheat', icon: '🌾', cat: 'crops', price: 5 },
        'tomato': { name: 'Tomato', icon: '🍅', cat: 'crops', price: 12 },
        'corn': { name: 'Corn', icon: '🌽', cat: 'crops', price: 8 },
        // Goods
        'milk': { name: 'Cow Milk', icon: '🥛', cat: 'goods', price: 25 },
        'egg': { name: 'Fresh Egg', icon: '🥚', cat: 'goods', price: 10 },
        // Equipment (New feature)
        'rusty-gear': { name: 'Rusty Gear', icon: '⚙️', cat: 'equipment', price: 50 },
        'magic-crystal': { name: 'Magic Crystal', icon: '🔮', cat: 'equipment', price: 250 },
        'tractor-part': { name: 'Tractor Engine', icon: '🚜', cat: 'equipment', price: 1000 }
    }
};

// ==========================================
// 🖼️ ANTI-BLACK SCREEN (IMAGE PRELOADER)
// ==========================================
const imagesToCache = ['background.jpg', 'logo.jpg', 'farm.png', 'market.png'];
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
        profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Farmer1",
        vipLevel: 0, level: 1, xp: 0, maxXp: 100, coins: 2000, gems: 1500, storage: 0, maxStorage: 15, 
        equippedTool: { type: null, id: null, icon: '✋', name: 'None' },
        stats: { cropsHarvested: 0, totalEarnings: 0, animalsOwned: 0, daysPlayed: 1 },
        inventory: { 'seed-wheat': 5, 'seed-tomato': 2, 'wheat': 1 }, // No 0 values
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
    for (let key in inv) { 
        if (!key.includes('seed')) total += inv[key]; 
    }
    return total;
}

// 🚀 SMART LOAD: Local First, Cloud Second
async function loadGameData() {
    let localKey = `myCozyFarmData_${PLAYER_ID}`;
    let localSaved = localStorage.getItem(localKey);
    let localData = localSaved ? JSON.parse(localSaved) : null;

    if (localData) {
        window.GameData = localData;
        window.updateGlobalUI(); 
    }

    try {
        const snapshot = await get(child(ref(db), `players/${PLAYER_ID}`));
        if (snapshot.exists()) {
            let cloudData = snapshot.val();
            if (!localData || (cloudData.lastSaved && cloudData.lastSaved > (localData.lastSaved || 0))) {
                window.GameData = cloudData;
                saveToLocalOnly(); 
                window.updateGlobalUI();
                if(typeof window.renderPlots === 'function') window.renderPlots();
            } else if (localData && localData.lastSaved > (cloudData.lastSaved || 0)) {
                needsCloudSync = true;
            }
        } else if (!localData) {
            window.GameData = getDefaultData(PLAYER_ID);
            saveToLocalOnly();
            needsCloudSync = true;
        }
    } catch (error) {
        console.log("Playing Offline - No Internet");
        if (!localData) window.GameData = getDefaultData(PLAYER_ID);
    }
    return window.GameData;
}

function saveToLocalOnly() {
    if(!window.GameData) return;
    
    // Auto Cleanup: Delete items with 0 quantity to save DB space
    for(let key in window.GameData.inventory) { if(window.GameData.inventory[key] <= 0) delete window.GameData.inventory[key]; }
    for(let key in window.GameData.marketInventory) { if(window.GameData.marketInventory[key] <= 0) delete window.GameData.marketInventory[key]; }

    window.GameData.storage = calculateTotalStorage(window.GameData.inventory);
    window.GameData.lastSaved = Date.now(); 
    localStorage.setItem(`myCozyFarmData_${PLAYER_ID}`, JSON.stringify(window.GameData));
}

window.saveGameData = function() {
    saveToLocalOnly();
    needsCloudSync = true;
    set(ref(db, `players/${PLAYER_ID}`), window.GameData).catch(()=>console.log("Sync queued"));
};

// ⏱️ BACKGROUND SYNC (Every 30 seconds)
setInterval(() => {
    if (needsCloudSync && window.GameData && PLAYER_ID) {
        set(ref(db, `players/${PLAYER_ID}`), window.GameData).then(() => { needsCloudSync = false; }).catch(e => console.log(e));
    }
}, 30000); 

// ==========================================
// 🔄 GLOBAL UI UPDATER 
// ==========================================
window.updateGlobalUI = function() {
    if(!window.GameData) return;
    
    const coins = document.querySelectorAll('#coin-ui');
    const gems = document.querySelectorAll('#gem-ui');
    const names = document.querySelectorAll('#player-name');

    coins.forEach(el => el.innerText = (el.tagName === 'SPAN' && !el.parentElement.classList.contains('mini-res')) ? window.GameData.coins : `🪙 ${window.GameData.coins}`);
    gems.forEach(el => el.innerText = `💎 ${window.GameData.gems}`);
    names.forEach(el => el.innerText = window.GameData.playerName);

    const storageTxt = document.getElementById('storage-txt');
    const storageBar = document.getElementById('storage-bar');
    if(storageTxt) storageTxt.innerText = `Storage: ${window.GameData.storage} / ${window.GameData.maxStorage}`;
    if(storageBar) storageBar.style.width = `${(window.GameData.storage / window.GameData.maxStorage) * 100}%`;
};

// Safe Toast Helper (Fallback if not defined in HTML)
function notify(msg, type="success") {
    if(window.showToast) window.showToast(msg, type);
    else if(window.customAlert) window.customAlert("Notice", msg, type);
    else alert(msg);
}

// ==========================================
// 🚀 PAGE ROUTER (WITH AUTH CHECK)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            PLAYER_ID = user.uid; 
            await loadGameData(); 
            window.updateGlobalUI();

            if (document.getElementById('main-farm')) initFarmLogic();
            else if (document.getElementById('inventory-grid')) initStorageLogic();
            else if (document.getElementById('market-grid')) initMarketLogic();
            else if (document.getElementById('profile-name')) initProfileLogic();
        } else {
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
                let seedIcon = window.GAME_DB.Seeds[plot.seedId].icon;
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
            grid.innerHTML += `<div class="plot empty-slot"></div><div class="plot empty-slot"></div><div class="plot empty-slot"></div>
                <div class="plot add-plot" style="grid-column: span 3; border-color: #00E5FF; background: rgba(0,0,0,0.6);" onclick="window.buyRow(${gemCost})">
                    <div class="plot-icon" style="color: #00E5FF;">➕</div><div class="plot-tag" style="color:#00E5FF; border-color:#00E5FF">Unlock Row: ${gemCost}💎</div>
                </div>`;
        }
    }

    window.openModal = function(category) {
        document.getElementById('modal-title').innerText = category;
        const content = document.getElementById('modal-content');
        content.innerHTML = ''; 

        let itemsArray = category === 'Seeds' ? Object.values(window.GAME_DB.Seeds) : window.GAME_DB[category];

        itemsArray.forEach(item => {
            let costText = 'Free'; let costClass = '';
            if(category === 'Seeds') {
                let qty = window.GameData.inventory[item.id] || 0;
                costText = `${qty}x 🎒`; costClass = 'price-bag';
            } else if(category === 'Fertilizers') {
                costText = `${item.cost}${item.cur === 'coin' ? '🪙' : '💎'}`; costClass = item.cur === 'coin' ? 'price-coin' : 'price-gem';
            }
            content.innerHTML += `<div class="popup-item" onclick="window.selectItem('${item.id}', '${category}')">
                <div class="popup-icon">${item.icon}</div><div class="popup-name">${item.name}</div><div class="popup-price ${costClass}">${costText}</div></div>`;
        });
        document.getElementById('item-modal').classList.add('show');
    };

    window.closeModal = function() { document.getElementById('item-modal').classList.remove('show'); };

    window.selectItem = function(id, category) {
        let itemsArray = category === 'Seeds' ? Object.values(window.GAME_DB.Seeds) : window.GAME_DB[category];
        let item = itemsArray.find(i => i.id === id);
        window.GameData.equippedTool = { type: item.type, id: item.id, icon: item.icon, name: item.name };
        window.saveGameData(); 
        document.getElementById('active-tool-display').innerHTML = `${window.GameData.equippedTool.icon} ${window.GameData.equippedTool.name}`;
        updateDynamicButton();
        window.closeModal();
    };

    window.clickPlot = function(index) {
        let plot = window.farmPlots[index];
        let tool = window.GameData.equippedTool;

        if (tool.type === null) return notify("Select a tool or seed!", "error");

        if (tool.id === 'tool-hoe') {
            if (plot.state === 'raw') { plot.state = 'dug'; notify("Dug a hole!", "success"); }
            else return notify("Can only dig Raw Land!", "error");
        } else if (tool.type === 'seed') {
            if (plot.state === 'dug') {
                if ((window.GameData.inventory[tool.id] || 0) > 0) {
                    window.GameData.inventory[tool.id]--; plot.state = 'planted'; plot.seedId = tool.id;
                    notify(`Planted ${tool.name}!`, "success");
                } else return notify("Not enough seeds in bag!", "error");
            } else return notify("Must dig a hole first!", "error");
        } else if (tool.id === 'tool-water') {
            if (plot.state === 'planted') {
                plot.state = 'watered';
                plot.readyAt = Date.now() + (window.GAME_DB.Seeds[plot.seedId].time * 1000);
                notify("Watered the crop! 💦", "success");
            } else return notify("Only water planted seeds!", "error");
        } else if (tool.type === 'fertilizer') {
            if (plot.state === 'watered') {
                let fert = window.GAME_DB.Fertilizers.find(f => f.id === tool.id);
                if(fert.cur === 'coin' && window.GameData.coins >= fert.cost) window.GameData.coins -= fert.cost;
                else if(fert.cur === 'gem' && window.GameData.gems >= fert.cost) window.GameData.gems -= fert.cost;
                else return notify("Not enough resources!", "error");
                
                plot.readyAt -= (fert.speed * 1000); 
                if(plot.readyAt <= Date.now()) { plot.state = 'ready'; plot.readyAt = null; }
                notify("Fertilizer applied! ✨", "success");
            } else return notify("Water crop before fertilizing!", "error");
        } else if (tool.id === 'tool-harvest') {
            if (plot.state === 'ready') {
                if(window.GameData.storage >= window.GameData.maxStorage) return window.customAlert("Barn Full", "Upgrade your Barn to store more!", "error");
                let produceId = window.GAME_DB.Seeds[plot.seedId].yields; 
                
                plot.state = 'raw'; plot.seedId = null; plot.readyAt = null;
                window.GameData.coins += 5; 
                window.GameData.inventory[produceId] = (window.GameData.inventory[produceId] || 0) + 1; 
                window.GameData.stats.cropsHarvested++;
                window.GameData.stats.totalEarnings += 5;
                notify("Harvested!", "success");
            } else return notify("Crop is not ready yet!", "error");
        }
        window.saveGameData(); window.updateGlobalUI(); window.renderPlots();
    };

    // Auto Crop Growth
    setInterval(() => {
        let needsRender = false, cropFinished = false;
        window.farmPlots.forEach(plot => {
            if (plot.state === 'watered' && plot.readyAt) {
                needsRender = true; 
                if (Math.ceil((plot.readyAt - Date.now()) / 1000) <= 0) {
                    plot.state = 'ready'; plot.readyAt = null; cropFinished = true; 
                }
            }
        });
        if(needsRender) window.renderPlots();
        if(cropFinished) window.saveGameData(); 
    }, 1000);

    window.upgradeBarn = function() {
        if (window.GameData.coins >= 1000) { window.GameData.coins -= 1000; window.GameData.maxStorage += 10; window.customAlert("Upgraded!", "Barn Upgraded! (+10 Capacity)", "success"); }
        else if (window.GameData.gems >= 10) { window.GameData.gems -= 10; window.GameData.maxStorage += 10; window.customAlert("Upgraded!", "Barn Upgraded! (+10 Capacity)", "success"); }
        else { window.customAlert("Not Enough Funds", "Need 1000🪙 or 10💎 to upgrade!", "error"); }
        window.saveGameData(); window.updateGlobalUI();
    };

    window.buyPlot = function(cost) {
        if (window.GameData.coins >= cost) {
            window.GameData.coins -= cost; window.farmPlots.push({ id: window.farmPlots.length + 1, state: 'raw', seedId: null, readyAt: null });
            notify("New plot unlocked!", "success"); window.saveGameData(); window.renderPlots(); window.updateGlobalUI();
        } else { window.customAlert("Not Enough Coins", `Need ${cost}🪙!`, "error"); }
    };

    window.buyRow = function(cost) {
        if (window.GameData.gems >= cost) {
            window.GameData.gems -= cost; window.buyPlot(0); // Cost handled via gems
        } else { window.customAlert("Not Enough Gems", "Need more Gems!", "error"); }
    };

    // Expose ALL actions for the dynamic buttons
    window.digAll = () => { let c=0; window.farmPlots.forEach(p => { if(p.state==='raw'){p.state='dug';c++;} }); if(c>0){notify(`Dug ${c} holes!`,"success"); window.saveGameData(); window.renderPlots();}else notify("No raw land!","error"); };
    window.waterAll = () => { let c=0; window.farmPlots.forEach(p => { if(p.state==='planted'){p.state='watered'; p.readyAt=Date.now()+(window.GAME_DB.Seeds[p.seedId].time*1000); c++;} }); if(c>0){notify(`Watered ${c} plots!`,"success"); window.saveGameData(); window.renderPlots();}else notify("No planted seeds!","error"); };
    window.harvestAll = () => { let c=0; window.farmPlots.forEach(p => { if(p.state==='ready' && window.GameData.storage < window.GameData.maxStorage){ let pId=window.GAME_DB.Seeds[p.seedId].yields; p.state='raw'; p.seedId=null; p.readyAt=null; window.GameData.coins+=5; window.GameData.inventory[pId]=(window.GameData.inventory[pId]||0)+1; window.GameData.stats.cropsHarvested++; c++; window.GameData.storage = calculateTotalStorage(window.GameData.inventory); } }); if(c>0){notify(`Harvested ${c} crops!`,"success"); window.saveGameData(); window.updateGlobalUI(); window.renderPlots();}else notify("Nothing ready or Barn full!","error"); };

    window.renderPlots(); updateDynamicButton();
}

// ==========================================
// 🎒 2. STORAGE PAGE LOGIC 
// ==========================================
function initStorageLogic() {
    let currentCategory = 'crops';
    let selectedItemId = null; let selectedStackQty = 0; let transferQty = 1;
    const STACK_LIMIT = 25; 

    function renderInventory() {
        const grid = document.getElementById('inventory-grid');
        if(!grid) return; grid.innerHTML = ''; 

        // Combine Seeds and Items for inventory display
        let masterItems = { ...window.GAME_DB.Seeds, ...window.GAME_DB.Items };

        for (let id in masterItems) {
            let item = masterItems[id];
            // Treat seeds object cat
            let itemCat = item.type === 'seed' ? 'seeds' : item.cat;

            if (itemCat === currentCategory) {
                let totalQty = window.GameData.inventory[id] || 0;
                if (totalQty === 0) {
                    grid.innerHTML += `<div class="item-card empty-card" onclick="window.openDetails('${id}', 0)"><div class="item-qty">x0</div><div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div></div>`;
                } else {
                    let fullStacks = Math.floor(totalQty / STACK_LIMIT);
                    let remainder = totalQty % STACK_LIMIT;
                    for(let i=0; i<fullStacks; i++) grid.innerHTML += `<div class="item-card" onclick="window.openDetails('${id}', ${STACK_LIMIT})"><div class="item-qty stack-full">x${STACK_LIMIT}</div><div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div></div>`;
                    if (remainder > 0) grid.innerHTML += `<div class="item-card" onclick="window.openDetails('${id}', ${remainder})"><div class="item-qty">x${remainder}</div><div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div></div>`;
                }
            }
        }
    }

    window.openDetails = function(id, stackQty) {
        let masterItems = { ...window.GAME_DB.Seeds, ...window.GAME_DB.Items };
        let item = masterItems[id];
        selectedItemId = id; selectedStackQty = stackQty; transferQty = 1; 
        
        document.getElementById('modal-title').innerText = item.name;
        document.getElementById('modal-icon').innerText = item.icon;
        document.getElementById('modal-qty').innerText = `Selected Slot Qty: ${stackQty}`;
        
        let actions = document.getElementById('modal-actions-container');
        if(stackQty > 0) {
            actions.innerHTML = `<div class="qty-selector"><div class="qty-btn" onclick="window.changeQty(-1)">-</div><div class="qty-display" id="transfer-qty-display">${transferQty}</div><div class="qty-btn" onclick="window.changeQty(1)">+</div></div>
                <div class="modal-actions"><button class="btn-3d btn-transfer" onclick="window.confirmTransfer()">🚚 Send to Market (Fee: 5🪙)</button>
                <button class="btn-3d btn-use" onclick="window.equipToFarm('${id}')">🚜 Equip & Go to Farm</button></div>`;
        } else {
            actions.innerHTML = `<div class="modal-actions"><button class="btn-3d btn-use" onclick="window.location.href='market.html'">Go Buy in Market</button></div>`;
        }
        document.getElementById('item-modal').classList.add('show');
    };

    window.changeQty = function(change) {
        transferQty += change;
        if(transferQty < 1) transferQty = 1; if(transferQty > selectedStackQty) transferQty = selectedStackQty;
        document.getElementById('transfer-qty-display').innerText = transferQty;
    };

    window.confirmTransfer = function() {
        if (window.GameData.coins < 5) return window.customAlert("Not Enough Coins!", "Need 5🪙 delivery fee.", "error");
        window.GameData.coins -= 5;
        window.GameData.inventory[selectedItemId] -= transferQty;
        window.GameData.marketInventory[selectedItemId] = (window.GameData.marketInventory[selectedItemId] || 0) + transferQty;
        
        let itemName = window.GAME_DB.Seeds[selectedItemId] ? window.GAME_DB.Seeds[selectedItemId].name : window.GAME_DB.Items[selectedItemId].name;
        
        window.saveGameData(); window.updateGlobalUI(); renderInventory();
        document.getElementById('item-modal').classList.remove('show');
        notify(`Sent ${transferQty}x ${itemName} to Market! 🚚`, "success");
    };

    window.equipToFarm = function(id) {
        let masterItems = { ...window.GAME_DB.Seeds, ...window.GAME_DB.Items };
        let item = masterItems[id];
        let toolType = item.type === 'seed' ? 'seed' : 'item';
        window.GameData.equippedTool = { type: toolType, id: id, icon: item.icon, name: item.name };
        window.saveGameData(); window.location.href = 'farm.html';
    };

    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() { currentCategory = this.getAttribute('data-cat'); renderInventory(); });
    });
    renderInventory();
}

// ==========================================
// 🏪 3. MARKET PAGE LOGIC
// ==========================================
function initMarketLogic() {
    let currentCategory = 'crops';

    function renderMarket() {
        const grid = document.getElementById('market-grid');
        if(!grid) return; grid.innerHTML = '';
        let hasItems = false;

        for (let id in window.GameData.marketInventory) {
            let qty = window.GameData.marketInventory[id];
            // Include both Seeds (rarely sold but possible) and Items
            let masterItems = { ...window.GAME_DB.Seeds, ...window.GAME_DB.Items };
            let item = masterItems[id];
            
            if (qty > 0 && item) {
                let itemCat = item.type === 'seed' ? 'seeds' : item.cat;
                if(itemCat === currentCategory) {
                    hasItems = true;
                    // Provide fallback price for seeds if sent to market by mistake
                    let price = item.price || 2; 
                    let totalProfit = price * qty;

                    grid.innerHTML += `<div class="item-card"><div class="item-qty">x${qty}</div><div class="item-icon">${item.icon}</div><div class="item-name">${item.name}</div>
                        <button class="btn-3d btn-sell-one" onclick="window.sellMarketItem('${id}', 1, ${price})">Sell 1x (🪙${price})</button>
                        <button class="btn-3d btn-sell-all" onclick="window.sellMarketItem('${id}', ${qty}, ${totalProfit})">Sell All (🪙${totalProfit})</button></div>`;
                }
            }
        }
        if (!hasItems) grid.innerHTML = `<div style="grid-column: span 2; text-align:center; color:#FFECB3; padding: 20px; font-weight:bold; border: 2px dashed #4E342E; border-radius: 12px; background: rgba(0,0,0,0.3); margin-top: 20px;">🚚 Your Stall is Empty!<br><br>Transfer items from Storage.</div>`;
    }

    window.sellMarketItem = function(id, qtyToSell, profit) {
        if(window.GameData.marketInventory[id] >= qtyToSell) {
            window.GameData.marketInventory[id] -= qtyToSell;
            window.GameData.coins += profit;
            window.GameData.stats.totalEarnings += profit; 
            
            let itemName = window.GAME_DB.Seeds[id] ? window.GAME_DB.Seeds[id].name : window.GAME_DB.Items[id].name;
            
            window.saveGameData(); window.updateGlobalUI(); renderMarket();
            notify(`Sold ${qtyToSell}x ${itemName} for ${profit}🪙!`, "success");
        }
    };

    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', function() { currentCategory = this.getAttribute('data-cat'); renderMarket(); });
    });
    renderMarket();
}

// ==========================================
// 👤 4. PROFILE PAGE LOGIC
// ==========================================
function initProfileLogic() {
    if(!window.GameData) return;
    
    // Inject correct Profile Pic (Avatar)
    const avatarImg = document.getElementById('profile-avatar-img');
    if(avatarImg) avatarImg.src = window.GameData.profilePic || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Farmer1';

    document.getElementById('profile-name').innerText = window.GameData.playerName;
    document.getElementById('profile-id').innerText = "ID: " + window.GameData.playerId.substring(0, 8);
    document.getElementById('profile-lvl').innerText = `Lvl ${window.GameData.level}`;
    document.getElementById('profile-vip').innerText = `VIP ${window.GameData.vipLevel || 0}`;
    
    let xp = window.GameData.xp || 0; let maxXp = window.GameData.maxXp || 100;
    document.getElementById('profile-xp-text').innerText = `${xp} / ${maxXp}`;
    document.getElementById('profile-xp-bar').style.width = `${(xp / maxXp) * 100}%`;

    let stats = window.GameData.stats;
    document.getElementById('stat-crops').innerText = stats.cropsHarvested;
    document.getElementById('stat-earnings').innerText = stats.totalEarnings;
    document.getElementById('stat-animals').innerText = stats.animalsOwned;
    document.getElementById('stat-days').innerText = stats.daysPlayed;

    const invGrid = document.getElementById('profile-inventory');
    invGrid.innerHTML = '';
    
    let sortedItems = [];
    let masterItems = { ...window.GAME_DB.Seeds, ...window.GAME_DB.Items };

    for (let key in window.GameData.inventory) {
        if(!key.includes('seed') && window.GameData.inventory[key] > 0) {
            sortedItems.push({ id: key, qty: window.GameData.inventory[key] });
        }
    }
    sortedItems.sort((a, b) => b.qty - a.qty); 

    let itemsToRender = Math.min(sortedItems.length, 8);
    for(let i=0; i<itemsToRender; i++) {
        let item = sortedItems[i];
        let icon = masterItems[item.id] ? masterItems[item.id].icon : '📦';
        invGrid.innerHTML += `<div class="inv-item">${icon}<div class="inv-qty">${item.qty}</div></div>`;
    }
    if(sortedItems.length === 0) invGrid.innerHTML = `<div style="grid-column: span 4; font-size:11px; color:#FFECB3;">Inventory empty! Go farm!</div>`;
}
