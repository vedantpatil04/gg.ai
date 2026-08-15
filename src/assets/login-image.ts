/**
 * GreenGuard AI — Login Page Environmental Photograph
 *
 * A single, isolated reference for the environmental photograph displayed on
 * the login page. Swap the `imageUrl` value here to change the image without
 * touching any authentication logic or component structure.
 *
 * Guidelines for replacement:
 *   - Prefer wide / landscape orientation (16:9 or wider)
 *   - Dark-leaning or high-contrast so overlay text stays legible
 *   - Realistic environmental / urban-green subject matter
 *   - No faces, no generic corporate photography
 */

export interface LoginHeroImage {
  /** The image URL or local public-folder path (e.g. "/images/login-hero.webp") */
  imageUrl: string;
  /** Descriptive alt text — used for accessibility, not shown to the user */
  imageAlt: string;
}

/**
 * Primary environmental photograph for the login page.
 * Replace `imageUrl` here to update the image across the whole login experience.
 */
export const LOGIN_HERO_IMAGE: LoginHeroImage = {
  imageUrl: "/images/cities/singapore/hero.webp",
  imageAlt:
    "Aerial view of Singapore city surrounded by lush tropical greenery, representing GreenGuard's environmental intelligence mission",
};
