import { action, computed, makeObservable, observable, runInAction } from "mobx";
import fakeData from "../fake_data/metadata.json"

export const SERVER_URL: string = 'https://34ee-34-32-215-40.ngrok-free.app';

interface IndexMap<T> {
    [uid: string]: T;
}

export type AudioSegmentStatus = 'UNCHECKED' | 'OK' | 'WARNING' | 'ERROR' | 'DISABLED';

export interface DatasetSource {
    source_name: string;
    language: string;
    batches: SourceBatch[];
    segments: SourceSegment[];
    batches_index: IndexMap<number>;
    segments_index: IndexMap<number>;
}

export interface AudioSlice {
    uid: string;
    filename: string;
    envelope_path: string;
    start: number;
    end: number;
    duration: number;
}

export interface SourceBatch extends AudioSlice {
    num: number;
}

export interface SourceSegment extends AudioSlice {
    text: string;
    words: any;
    batch: string;
    num: number;
    status: AudioSegmentStatus;
}

export class AudioSourceStore  {
 
    @observable source: DatasetSource | null = null;//fakeData as unknown as DatasetSource;
    @observable selectedSegment: SourceSegment | null = null;
 
    constructor() {
        makeObservable(this);

        this.init();
    }

    async init() {
        const data = await fetch(`${SERVER_URL}/data`).then(res => res.json());

        runInAction(() => this.source = data);
    }

    @action selectSegment(uid:  string)  {
        const segment = this.getSegment(uid);
        
        this.selectedSegment = segment ?? null;
    }

    @action selectNextSegment() {
        if (!this.selectedSegment) {
            return;
        }

        const orderedSegments = this.source!.segments;
        const currentIndex = this.selectedSegment.num;

        const newIndex = (currentIndex + 1) % orderedSegments.length;

        this.selectedSegment = orderedSegments[newIndex];
    }

    @action selectPreviousSegment() {
        if (!this.selectedSegment) {
            return;
        }

        const orderedSegments = this.source!.segments;
        const currentIndex = this.selectedSegment.num;

        const newIndex = (orderedSegments.length + currentIndex - 1) % orderedSegments.length;

        this.selectedSegment = orderedSegments[newIndex];
    }

    @action setSegmentStart(uid: string, time: number) {
        const segment = this.getSegment(uid);
        segment.start = time;
    }

    @action setSegmentEnd(uid: string, time: number) {
        const segment = this.getSegment(uid);
        segment.end = time;
    }
    
    getBatch(uid: string): SourceBatch {
        const batchIndex: number | undefined = this.source!.batches_index[uid as string];

        if (batchIndex === undefined) {
            throw new Error(`Unknown batch ${uid}`)
        }
        const batch = this.source!.batches[batchIndex];

        if (!batch) {
            throw new Error(`Batch data not found ${uid}`)
        }

        return batch;
    }

    getSegment(uid: string): SourceSegment {
        const segmentIndex: number | undefined = this.source!.segments_index[uid as string];

        if (segmentIndex === undefined) {
            throw new Error(`Unknown segment ${uid}`)
        }

        const segment = this.source!.segments[segmentIndex];

        if (!segment) {
            throw new Error(`Segment data not found ${uid}`)
        }

        return segment;
    }

    @action async updateSegmentSlice(uid: string) {
        const segment = this.getSegment(uid);

        const options = {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
                start: segment.start,
                end: segment.end,
                text: segment.text,
            })
        }

        const updated = await fetch(`${SERVER_URL}/segment/${uid}/slice`, options).then(res => res.json())

        runInAction(() => {
            this.source!.segments[segment.num] = updated;
            
            if (this.selectedSegment?.uid === uid) {
                this.selectedSegment = this.source!.segments[segment.num];
            }
        });

        return updated;
    }

    @action async updateSegmentStatus(uid: string) {
        const segment = this.getSegment(uid);

        const options = {
            method: 'POST',
            headers: new Headers({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
                status: segment.status,
            })
        }

        const updated = await fetch(`${SERVER_URL}/segment/${uid}/status`, options).then(res => res.json())

        runInAction(() => {
            this.source!.segments[segment.num] = updated;
            
            if (this.selectedSegment?.uid === uid) {
                this.selectedSegment = this.source!.segments[segment.num];
            }
        });

        return updated;
    }
 
    // @computed get listLength()  {
    //     return  this.items.length;
    // }
}
