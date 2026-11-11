<script setup>
import { usePaintStore } from '../../stores/paintStore.js'
import { paint } from '../../services/paintApi.js'

const store = usePaintStore()
</script>

<template>
  <div class="dialog">
    <h2>Paint</h2>
    <p>Do you want to save changes to {{ store.fileName }}?</p>
    <div class="dialog-buttons">
      <button type="button" autofocus @click="paint.saveAndContinue()">Save</button>
      <button type="button" @click="paint.discardChanges()">Don't save</button>
      <button type="button" @click="paint.cancelDialog()">Cancel</button>
    </div>
  </div>
</template>
