declare module "tsx";

declare module "tsx/esm/api" {
  export function load(
    url: string | URL,
    options?: {
      tsconfig?: string;
      parentURL?: string;
    }
  ): Promise<any>;
}
