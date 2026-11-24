<script setup lang="ts">
import { ref } from 'vue'
import { useGame } from './stores/game'
import { fmt } from './core/formulas'
import InstallPrompt from './components/InstallPrompt.vue'
import Tribulation from './components/Tribulation.vue'
import EventModal from './components/EventModal.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import AchievementsPanel from './components/AchievementsPanel.vue'
import TabBar from './components/TabBar.vue'
import ToastHost from './components/ToastHost.vue'
import CultivateView from './views/CultivateView.vue'
import BagView from './views/BagView.vue'
import TechniquesView from './views/TechniquesView.vue'
import AlchemyView from './views/AlchemyView.vue'
import DungeonView from './views/DungeonView.vue'

const g = useGame()
g.init()
const showSettings = ref(false)
const showAch = ref(false)
</script>

<template>
  <div v-if="g.loaded" class="shell">
    <main class="app">
      <section v-if="!g.started" class="intro">
        <h1>問道長生</h1>
        <p class="tagline">大道三千，唯問長生</p>
        <button class="btn big" @click="g.newGame()">測靈根．入仙途</button>
      </section>

      <template v-else>
        <header>
          <div>
            <div class="realm">{{ g.info.label }}</div>
            <div class="sub"><template v-if="g.p.rebirths">第{{ g.p.rebirths + 1 }}世．</template>{{ g.root.name }}．《{{ g.tech.name }}》．每秒 {{ fmt(g.perSec) }}</div>
          </div>
          <div>
            <button class="icon" aria-label="成就" @click="showAch = true">🏆</button>
            <button class="icon" aria-label="設定" @click="showSettings = true">⚙</button>
          </div>
        </header>
        <CultivateView v-if="g.tab === 'cultivate'" />
        <TechniquesView v-else-if="g.tab === 'techniques'" />
        <AlchemyView v-else-if="g.tab === 'alchemy'" />
        <DungeonView v-else-if="g.tab === 'dungeon'" />
        <BagView v-else-if="g.tab === 'bag'" />
      </template>
    </main>
    <TabBar v-if="g.started" />

    <EventModal />
    <Tribulation v-if="g.tribulation" @done="g.finishTribulation" />
    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <AchievementsPanel v-if="showAch" @close="showAch = false" />
    <InstallPrompt />
    <ToastHost />
  </div>
</template>

<style scoped>
.shell { max-width: 480px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; }
.app { flex: 1; display: flex; flex-direction: column; gap: 14px;
  padding: calc(16px + env(safe-area-inset-top)) 16px 16px; box-sizing: border-box; }
.intro { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; }
.intro h1 { font-size: 48px; letter-spacing: .3em; margin: 0; font-family: var(--brush); }
.tagline { opacity: .6; letter-spacing: .4em; margin-bottom: 32px; }
header { display: flex; justify-content: space-between; align-items: center; }
.realm { font-size: 28px; font-family: var(--brush); letter-spacing: .1em; }
.sub { font-size: 13px; opacity: .7; }
.icon { font-size: 22px; background: none; border: none; color: inherit; padding: 8px; }
</style>
