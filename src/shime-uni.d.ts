export { };

declare module "vue" {
  type Hooks = App.AppInstance & Page.PageInstance;
  interface ComponentCustomOptions extends Hooks { }
}

declare module "*.wav" {
  const src: string;
  export default src;
}