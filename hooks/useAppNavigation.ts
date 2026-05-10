// hooks/useAppNavigation.ts
import { router } from 'expo-router';

export const useAppNavigation = () => {
  const push = (href: string) => router.push(href);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  const replace = (href: string) => router.replace(href);
  return { push, back, replace };
};