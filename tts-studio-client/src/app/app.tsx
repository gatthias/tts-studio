import { observer } from "mobx-react-lite";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AudioSourceStore, SourceBatch, SourceSegment } from "../stores/AudioSourceStore";

interface AppContext {
  audioSourceStore: AudioSourceStore
}

const appContextValue: AppContext = {
  audioSourceStore: new AudioSourceStore()
}

const AppContext = createContext<AppContext>(appContextValue);

export const useStores = () => {
  return useContext(AppContext);
};


const App = observer((): JSX.Element => {
  const { audioSourceStore } = useStores();

  if (!audioSourceStore.source) {
    return <span>Loading...</span>;
  }

  const [batchUid] = Object.keys(audioSourceStore.source.batches);
  const batch = audioSourceStore.source.batches[batchUid as any];

  const segments = Object.values(audioSourceStore.source.segments).filter(segment => segment.batch === batch.uid);
  
  return (
    <div className="flex flex-col">
      <div>
        <Batch batch={batch} segments={segments} />
      </div>
      <div className="p-4">
        { audioSourceStore.selectedSegment && <SegmentCard segment={audioSourceStore.selectedSegment} /> }
      </div>
    </div>
  )
});

const SegmentCard = ({ segment }: { segment: SourceSegment }) => {
  const { audioSourceStore } = useStores();
  const batch = useMemo(() => audioSourceStore.getBatch(segment.batch), [segment.batch]);

  return (
    <div className="p-2 rounded shadow-md max-w-lg">
      <div>
        {segment.text}
      </div>
    </div>
  )
}

const Batch = ({ batch, segments }: { batch: SourceBatch, segments: SourceSegment[] }) => {
  return (
    <svg viewBox="0 0 512 128" focusable="false" height="128" width="512">
      <path d={batch.envelope_path} stroke="none" fill="black" opacity="0.7"/>
      { segments.map(segment => <Segment batch={batch} segment={segment} key={segment.uid} />)}
    </svg>
  );
}

const Segment = ({ batch, segment }: { batch: SourceBatch, segment: SourceSegment }) => {
  const { audioSourceStore } = useStores();

  const selectSegment = useCallback(() => {
    audioSourceStore.selectSegment(segment.uid);
  }, [segment]);

  const start = segment['start'] % (300 * 1000);
  const end = segment['end'] % (300 * 1000);
  const duration = batch['duration'];

  const x = start / duration * 512;
  const y = 0;
  const width = (end - start) / duration * 512;
  const height = 128;

  return (
    <g onClick={selectSegment}>
      <rect x={x} y={y} width={width} height={height} className="fill-red-500 stroke-red-600 opacity-50 hover:opacity-80"/>
    </g>
  );
}

export default App;
