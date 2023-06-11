import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { observer } from "mobx-react-lite";
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AudioSourceStore, SourceBatch, SourceSegment, SERVER_URL } from "../stores/AudioSourceStore";

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

const timeToString = (time: number) => {
  return Math.floor(time / 1000 * 10) / 10;
}

interface ButtonProps extends PropsWithChildren {
  loading?: boolean;
  onClick?: () => void;
}

const Button = ({ onClick, loading = false, children }: ButtonProps) => {
  const className = `bg-slate-500 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded`;
  
  return (
    <button className={className} onClick={() => onClick?.()} disabled={!!loading}>
      <div className="flex justify-center items-center">
        { loading && <div><ArrowPathIcon className="animate-spin w-4 h-4 mr-2"/></div>}
        <div>
          { children }
        </div>
      </div>
    </button>
  )
}


const App = observer((): JSX.Element => {
  const { audioSourceStore } = useStores();

  if (!audioSourceStore.source) {
    return <span>Loading...</span>;
  }

  const batches = audioSourceStore.source.batches
  const sourceSegments = audioSourceStore.source.segments;

  // TODO: dataset stats (words count, durations avg & deviation, ...)

  return (
    <div className="flex flex-col">
      <div className="p-2">
          <div className="overflow-x-auto bg-slate-300 rounded">
              <div style={{ width: `${batches.length * 512}px` }} className="flex">
                  {
                      batches.map(batch => {
                          const segments = sourceSegments.filter(segment => segment.batch === batch.uid);

                          return <Batch batch={batch} segments={segments} key={batch.uid} />
                      })
                  }
              </div>
          </div>
      </div>
      <div className="flex justify-center">
        { audioSourceStore.selectedSegment && (
            <div className="max-w-lg">
              <div className="flex justify-between p-2">
                <Button onClick={() => audioSourceStore.selectPreviousSegment()}>Prev</Button>
                <Button onClick={() => audioSourceStore.selectNextSegment()}>Next</Button>
              </div>
              <SegmentCard segment={audioSourceStore.selectedSegment} />
            </div>
        ) }
      </div>
    </div>
  )
});

const SegmentCard = observer(({ segment }: { segment: SourceSegment }) => {
  const { audioSourceStore } = useStores();
  const batch = useMemo(() => audioSourceStore.getBatch(segment.batch), [segment.batch]);
  const [saving, setSaving] = useState(false);
  const [audioTimestamp, setAudioTimestamp] = useState(Date.now())

  const OFFSET_START=0.3;
  const OFFSET_END=-0.2;
  const FADE_ALPHA=0.9;

  const start = segment['start'] % (300 * 1000);
  const end = segment['end'] % (300 * 1000);
  const duration = batch['duration'];

  const x = start / duration * 512;
  const y = 0;
  const width = (end - start) / duration * 512;
  const height = 128;

  const scale = 256 / width;
  const pan = x - width / 2;

  const x_fade_start = x + (OFFSET_START * FADE_ALPHA * 1000 / duration * 512)
  const x_fade_end = x + width + (OFFSET_END * FADE_ALPHA * 1000 / duration * 512)

  const saveSegment = useCallback(async () => {
    setSaving(true);
    await audioSourceStore.updateSegmentSlice(segment.uid);
    setSaving(false);
    setAudioTimestamp(Date.now())
  }, [segment]);

  return (
    <div className="p-2 rounded shadow-md bg-zinc-800 w-[512px]">
      <div className="bg-slate-300 rounded">
        <svg viewBox="0 0 512 128" focusable="false" width="100%">
          <g transform={`scale(${scale} 1) translate(${-pan} 0)`}>
            <path d={batch.envelope_path} stroke="none" fill="black" opacity="0.7"/>
            <rect x={x} y={y} width={width} height={height} opacity="0.5" fill="slate"/>

            <line x1={x} y1="128" x2={x_fade_start} y2="0" stroke="slate" strokeWidth="0.05"/>
            <line x1={x + width} y1="128" x2={x_fade_end} y2="0" stroke="slate" strokeWidth="0.05"/>
          </g>
        </svg>
      </div>
      <div className="p-2">
        <span className="text-sm">duration: {timeToString(segment.duration)}s [{timeToString(segment.start)}s - {timeToString(segment.end)}s]</span>
      </div>
      <div className="p-2">
        <audio controls={true} src={`${SERVER_URL}/segment/${segment.uid}/wav?t=${audioTimestamp}`} preload="none" />
      </div>
      <div className="p-2">
        {segment.text}
      </div>
      <div className="p-2 text-slate-900">
        <input className="bg-zinc-300 rounded" type="number" value={segment.start} onChange={(e: any) => audioSourceStore.setSegmentStart(segment.uid, Number(e.target.value))} step="100"/>
        <input className="bg-zinc-300 rounded" type="number" value={segment.end} onChange={(e: any) => audioSourceStore.setSegmentEnd(segment.uid, Number(e.target.value))} step="100"/>
      </div>
      <div className="p-2">
        <span className="text-sm">uid: {segment.uid}</span>
      </div>
      <div className="p-2">
        <Button onClick={saveSegment} loading={saving}>Save</Button>
      </div>
    </div>
  )
})

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

  const className = `${audioSourceStore.selectedSegment?.uid === segment.uid ? 'opacity-80 hover:opacity-90' : 'opacity-50 hover:opacity-80'} fill-slate-500 stroke-slate-600`;

  return (
    <g onClick={selectSegment}>
      <rect x={x} y={y} width={width} height={height} className={className}/>
    </g>
  );
}

export default App;
