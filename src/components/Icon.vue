<script>
import { defineComponent, h } from 'vue'
import { iconData } from './iconData.js'

export default defineComponent({
  name: 'Icon',
  props: {
    name: { type: String, required: true },
    size: { type: [Number, String], default: 18 },
  },
  setup(props) {
    return () => h('svg', {
      class: 'icon',
      width: props.size,
      height: props.size,
      viewBox: '0 0 24 24',
      fill: 'none',
      'aria-hidden': 'true',
    }, (iconData[props.name] || []).map((node) => h(node.tag, node.attrs)))
  },
})
</script>
