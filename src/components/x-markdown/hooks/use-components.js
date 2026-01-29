import { h } from 'vue'
import { CodeX } from '../components/index'

function useComponents() {
  const components = {
    code: raw => h(CodeX, { raw })
  }
  return components
}

export { useComponents }
