<template>
  <section class="panel">
    <h3>Notifications</h3>

    <p v-if="state === 'install'" class="note">
      On iPhone, notifications only work from the home screen app: tap <strong>Share</strong> →
      <strong>Add to Home Screen</strong>, open the book club from there and come back here.
    </p>
    <p v-else-if="state === 'unsupported'" class="note">This browser can't show notifications.</p>
    <p v-else-if="state === 'denied'" class="note">
      Notifications are blocked for this app. Allow them in the phone's settings, then reload.
    </p>
    <div v-else-if="state" class="device">
      <label class="switch-row">
        <input type="checkbox" :checked="state === 'on'" :disabled="busy" @change="toggleDevice" />
        Notifications on this device
      </label>
      <button v-if="state === 'on'" type="button" class="link" :disabled="busy" @click="test">Send a test</button>
    </div>
    <p v-if="!standalone && state !== 'install'" class="note small">
      Tip: add the book club to your home screen (browser menu → Install app / Add to Home Screen).
    </p>

    <template v-if="settings">
      <div class="setting">
        <span>Weekly status</span>
        <div class="choices">
          <select :value="settings.weeklyDay === null ? 'off' : settings.weeklyDay" @change="setDay($event.target.value)">
            <option value="off">Off</option>
            <option v-for="(day, i) in days" :key="i" :value="i">{{ day }}</option>
          </select>
          <select v-if="settings.weeklyDay !== null" :value="settings.weeklyHour" @change="save({ weeklyHour: Number($event.target.value) })">
            <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ String(h - 1).padStart(2, "0") }}:00</option>
          </select>
        </div>
      </div>
      <label class="switch-row">
        <input type="checkbox" :checked="settings.notifyProgress" @change="save({ notifyProgress: $event.target.checked })" />
        When someone else updates their progress
      </label>
      <label class="switch-row">
        <input type="checkbox" :checked="settings.notifyMeetups" @change="save({ notifyMeetups: $event.target.checked })" />
        A week before a meetup, if I'm behind on the reading
      </label>
      <p class="note small">These settings follow you to every device with notifications on.</p>
    </template>

    <p v-if="message" class="note small">{{ message }}</p>
    <p v-if="error" class="note error">{{ error }}</p>
  </section>
</template>

<script>
import api, { errorMessage } from "@/api";
import { getPushState, isStandalone, sendTestPush, turnPushOff, turnPushOn } from "@/push";

export default {
  data() {
    return {
      state: "",
      standalone: isStandalone(),
      settings: null,
      busy: false,
      message: "",
      error: "",
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    };
  },
  async created() {
    this.state = await getPushState();
    try {
      const { data } = await api.get("/settings");
      this.settings = data;
    } catch (error) {
      this.error = errorMessage(error);
    }
  },
  methods: {
    async toggleDevice() {
      this.busy = true;
      this.error = "";
      this.message = "";
      try {
        if (this.state === "on") await turnPushOff();
        else await turnPushOn();
      } catch (error) {
        this.error = error.response ? errorMessage(error) : error.message;
      } finally {
        this.state = await getPushState();
        this.busy = false;
      }
    },
    async test() {
      this.busy = true;
      this.error = "";
      try {
        const { sent } = await sendTestPush();
        this.message = sent ? "Sent. It should show up in a moment." : "No device got it. Turn notifications off and on again.";
      } catch (error) {
        this.error = errorMessage(error);
      } finally {
        this.busy = false;
      }
    },
    setDay(value) {
      return this.save({ weeklyDay: value === "off" ? null : Number(value) });
    },
    async save(change) {
      this.error = "";
      try {
        const { data } = await api.put("/settings", change);
        this.settings = data;
      } catch (error) {
        this.error = errorMessage(error);
      }
    },
  },
};
</script>

<style scoped>
.panel {
  margin-bottom: 16px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(20, 16, 30, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
}

.panel h3 {
  margin: 0 0 10px;
  color: #ffc90e;
}

.note {
  opacity: 0.85;
}

.note.small {
  font-size: 12px;
}

.error {
  color: #ff7b7b;
}

.device {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

.switch-row input {
  width: 22px;
  height: 22px;
  accent-color: #ffc90e;
}

.setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
}

.choices {
  display: flex;
  gap: 6px;
}

select {
  font: inherit;
  font-size: 15px;
  padding: 6px 8px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
}

button.link {
  width: auto;
  height: auto;
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  color: #ffc90e;
  font-size: 13px;
  text-decoration: underline;
}
</style>
