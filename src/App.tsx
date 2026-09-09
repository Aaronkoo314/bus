/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusArrivalPanel } from './components/BusArrivalPanel';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col justify-between py-6 sm:py-10">
      <BusArrivalPanel />
    </div>
  );
}

