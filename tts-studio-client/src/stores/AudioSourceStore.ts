import { action, computed, makeObservable, observable } from "mobx";
import fakeData from "../fake_data/metadata.json"

interface IndexMap<T> {
    [uid: string]: T;
}

export interface DatasetSource {
    source_name: string;
    language: string;
    batches: IndexMap<SourceBatch>;
    segments: IndexMap<SourceSegment>;
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
}

export class AudioSourceStore  {
 
    @observable source: DatasetSource | null = fakeData as unknown as DatasetSource;
    @observable selectedSegment: SourceSegment | null = null;
 
    constructor() {
        makeObservable(this);
    }

    @action selectSegment(uid:  string)  {
        const segment = this.source!.segments[uid as string];
        
        this.selectedSegment = segment ?? null;
    }
    
    getBatch(uid: string): SourceBatch {
        const batch = this.source!.batches[uid as string];

        if (!batch) {
            throw new Error(`Unknown batch ${uid}`)
        }

        return batch;
    }

    getSegment(uid: string): SourceSegment {
        const segment = this.source!.segments[uid as string];

        if (!segment) {
            throw new Error(`Unknown batch ${uid}`)
        }

        return segment;
    }
 
    // @computed get listLength()  {
    //     return  this.items.length;
    // }
}
