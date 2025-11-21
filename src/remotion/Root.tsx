import React from 'react';
import { Composition } from 'remotion';
import { CaptionComposition } from './CaptionComposition';

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const DEFAULT_DURATION = FPS * 60;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="CaptionVideo"
      component={CaptionComposition as React.ComponentType<any>}
      durationInFrames={DEFAULT_DURATION}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      defaultProps={{
        staticSrc: '',
        pages: [],
        useStaticFile: false,
      }}
    />
  </>
);

