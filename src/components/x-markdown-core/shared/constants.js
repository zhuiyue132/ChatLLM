export const DEFAULT_PROPS = {
  markdown: '',
  allowHtml: true,
  enableLatex: true,
  enableBreaks: true,
  enableCodeLineNumber: false,
  codeXRender: () => ({}),
  codeXSlot: () => ({}),
  codeHighlightTheme: null,
  customAttrs: () => ({}),
  remarkPlugins: () => [],
  remarkPluginsAhead: () => [],
  rehypePlugins: () => [],
  rehypePluginsAhead: () => [],
  rehypeOptions: () => ({}),
  sanitize: false,
  sanitizeOptions: () => ({}),
  mermaidConfig: () => ({}),
  langs: () => [],
  defaultThemeMode: 'light',
  colorReplacements: () => ({}),
  secureViewCode: false
}

export const MARKDOWN_CORE_PROPS = {
  markdown: {
    type: String,
    default: DEFAULT_PROPS.markdown
  },
  allowHtml: {
    type: Boolean,
    default: DEFAULT_PROPS.allowHtml
  },
  enableCodeLineNumber: {
    type: Boolean,
    default: DEFAULT_PROPS.enableCodeLineNumber
  },
  enableLatex: {
    type: Boolean,
    default: DEFAULT_PROPS.enableLatex
  },
  enableBreaks: {
    type: Boolean,
    default: DEFAULT_PROPS.enableBreaks
  },
  codeXRender: {
    type: Object,
    default: DEFAULT_PROPS.codeXRender
  },
  codeXSlot: {
    type: Object,
    default: DEFAULT_PROPS.codeXSlot
  },
  codeHighlightTheme: {
    type: Object,
    default: DEFAULT_PROPS.codeHighlightTheme
  },
  customAttrs: {
    type: Object,
    default: DEFAULT_PROPS.customAttrs
  },
  remarkPlugins: {
    type: Array,
    default: DEFAULT_PROPS.remarkPlugins
  },
  remarkPluginsAhead: {
    type: Array,
    default: DEFAULT_PROPS.remarkPluginsAhead
  },
  rehypePlugins: {
    type: Array,
    default: DEFAULT_PROPS.rehypePlugins
  },
  rehypePluginsAhead: {
    type: Array,
    default: DEFAULT_PROPS.rehypePluginsAhead
  },
  rehypeOptions: {
    type: Object,
    default: DEFAULT_PROPS.rehypeOptions
  },
  sanitize: {
    type: Boolean,
    default: DEFAULT_PROPS.sanitize
  },
  sanitizeOptions: {
    type: Object,
    default: DEFAULT_PROPS.sanitizeOptions
  },
  mermaidConfig: {
    type: Object,
    default: DEFAULT_PROPS.mermaidConfig
  },
  langs: {
    type: Array,
    default: DEFAULT_PROPS.langs
  },
  defaultThemeMode: {
    type: String,
    default: DEFAULT_PROPS.defaultThemeMode
  },
  colorReplacements: {
    type: Object,
    default: DEFAULT_PROPS.colorReplacements
  },
  needViewCodeBtn: {
    type: Boolean,
    default: true
  },
  secureViewCode: {
    type: Boolean,
    default: DEFAULT_PROPS.secureViewCode
  },
  isDark: {
    type: Boolean,
    default: false
  }
}
