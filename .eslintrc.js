module.exports = {
  root: true,
  extends: ['expo'],
  rules: {
    'no-restricted-imports': ['error', {
      paths: [{
        name: 'expo-router',
        importNames: ['router'],
        message: 'Use `useAppNavigation` hook instead of raw router.'
      }]
    }]
  }
};
