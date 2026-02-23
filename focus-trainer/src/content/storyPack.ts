import demoStory from '@/src/content/demoStory.json';
import { Story } from '@/src/domain/types';

const stories: Story[] = [demoStory as Story];

export function getStories(): Story[] {
  return stories;
}
