/**
 * Centers the given string such that it's the given width.
 */
const asciiCenter = (str: string, width: number, spacer = ' ') => {
  let right = true;
  while (str.length < width) {
    str = right ? str + spacer : spacer + str;
    right = !right;
  }

  return str;
};

export interface ITimelineRecord<T> {
  frame: number;
  key: string;
  value: T;
}

/**
 * Timeline that formats a sequence of marble assertions like
 * "--a--b--c!".
 */
export class AssertionTimeline<T> {
  /**
   * Number of empty frames
   */
  public static compactThreshold = 10;

  /**
   * Prints all items in the assert timeline, such that all the timelines
   * are nicely aligned.
   */
  public static printAll(timelines: Array<AssertionTimeline<any>>, minWidth = 10): string[] {
    const data = timelines.map(t => t.items.slice());

    // Record the last frame we're on and, for each timeline, make a string.
    // We'll build all of these in parallel.
    let frame = -1;
    const output = data.map(() => '');
    while (true) {
      // Find the index of the next frame that any series has.
      let nextFrame = Infinity;
      for (const series of data) {
        if (series.length > 0) {
          nextFrame = Math.min(series[0].frame, nextFrame);
        }
      }

      // If we didn't find anything, we're finished.
      if (!isFinite(nextFrame)) {
        break;
      }

      // If the next frame is farther away than our compaction threadshold,
      // replace the gap with the number/milliseconds delay.
      if (nextFrame > AssertionTimeline.compactThreshold) {
        // -3 because we write two frames on either side (-2), and then we want
        // to write up to just before that target next frame (-1) since the
        // symbols we write on this iteration will be that frame.
        const value = `-${nextFrame - frame - 3}ms-`;
        for (let i = 0; i < output.length; i++) {
          output[i] += value;
        }

        frame = nextFrame - 1;
      }

      // Build all the symbols that we want to push. Multiple symbols in a
      // single frame are written as `(a b)`. Record the longest symbol we have.
      const nextSymbols: string[] = [];
      let longestSymbol = 0;
      for (const series of data) {
        const syms: string[] = [];
        while (series.length > 0 && series[0].frame === nextFrame) {
          syms.push(series.shift()!.key);
        }

        const symbol =
          syms.length === 0 ? '-' : syms.length === 1 ? syms[0] : `(${syms.join(' ')})`;
        longestSymbol = Math.max(symbol.length, longestSymbol);
        nextSymbols.push(symbol);
      }

      // Write them all out. Pad up to the current frame, and then center
      // whatever symbol we write for this timer series.
      for (let i = 0; i < nextSymbols.length; i++) {
        // the symbol we're about to write is the one at "nextFrame", so write
        // dashes up to right before the current frame (hence the -1).
        output[i] += '-'.repeat(nextFrame - frame - 1) + asciiCenter(nextSymbols[i], longestSymbol);
      }

      frame = nextFrame;
    }

    // Pad the output, just so that short sequences look nice.
    for (let i = 0; i < output.length; i++) {
      output[i] += '-'.repeat(Math.max(0, minWidth - output[i].length));
    }

    return output;
  }

  /**
   * List of items in the timeline.
   */
  public readonly items: ReadonlyArray<ITimelineRecord<T>> = [];

  /**
   * Adds a symbol to be written at the given frame of the timeline.
   */
  public add(frame: number, key: string, value: T) {
    (this.items as Array<ITimelineRecord<T>>).push({ frame, key, value });
  }

  /**
   * Pretty-prints the timeline.
   */
  public print(minWidth = 10): string {
    return AssertionTimeline.printAll([this], minWidth)[0];
  }
}
