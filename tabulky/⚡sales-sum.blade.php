<?php

use Livewire\Component;
use Livewire\Attributes\Defer;

use App\Models\Branch;
use App\Models\DailyClosingRow;

use Carbon\Carbon;
use Carbon\CarbonPeriod;

new #[Defer] class extends Component
{


    public $branch;
    public $branches;

    public $from;
    public $to;
    public $days = [];

    public $data = [];

    public $singleData = [];

    public function mount ()
    {
        $this->branch = auth()->user()->activeBranch();
        if($this->branch) {
            if ($this->branch->id == mainBranchGet()) {
                $this->branches = Branch::all();
            } else {
                $this->branches = Branch::where('id', $this->branch->id)->get();
            }

            $this->from = Carbon::now()->subDays(7)->format('Y-m-d');
            $this->to = Carbon::now()->format('Y-m-d');
            $this->loadData();
        }

    }


    public function loadData()
    {
        // Normalizácia dátumov
        $from = $this->from ? Carbon::parse($this->from) : now()->subDays(7);
        $to   = $this->to   ? Carbon::parse($this->to)   : now();

        if ($from->gt($to)) {
            [$from, $to] = [$to, $from];
            $this->from = $from->format('Y-m-d');
            $this->to   = $to->format('Y-m-d');
        }

        // Inicializácia dní (sumy) + label dopredu (už bez Carbon::parse vo view)
        $days = [];

        foreach (CarbonPeriod::create($from, $to) as $date) {

            $key = $date->format('Y-m-d');

            $days[$key] = [
                'sum' => 0,
                'label' => $date->translatedFormat('d.m. D'),
            ];
        }
        // Zoznam branch IDs
        $branchIds = $this->branches->pluck('id')->all();

        $salesRows = DailyClosingRow::query()
        ->selectRaw('
            daily_closings.branch_id,
            DATE(daily_closings.date) as closing_date,
            SUM(daily_closing_rows.value) as sales
        ')
        ->join(
            'daily_closings',
            'daily_closings.id',
            '=',
            'daily_closing_rows.daily_closing_id'
        )
        ->whereIn('daily_closings.branch_id', $branchIds)
        ->whereBetween('daily_closings.date', [$from, $to])
        ->whereIn('daily_closing_rows.type_id', [
            DailyClosingRow::SALES,
            DailyClosingRow::SALE_MANUAL,
        ])
        ->groupBy(
            'daily_closings.branch_id',
            'closing_date'
        )
        ->get();

        $indexed = $salesRows->keyBy(function ($row) {
            return $row->branch_id . '_' . $row->closing_date;
        });

        $data = [];

        foreach ($this->branches as $branch) {

            $value = [
                'id' => $branch->id,
                'name' => $branch->name,
                'color' => $branch->color,
                'data' => [],
                'sum' => 0,
            ];

            foreach ($days as $dateKey => $_day) {

                $indexKey = $branch->id . '_' . $dateKey;

                $sales = isset($indexed[$indexKey])
                    ? (float) $indexed[$indexKey]->sales
                    : null;

                $value['data'][$dateKey] = $sales;

                if ($sales !== null) {
                    $value['sum'] += $sales;
                    $days[$dateKey]['sum'] += $sales;
                }
            }

            $data[] = $value;
        }

        // Full total dopredu (nepočítať v Blade)
        $fullSum = array_sum(array_column($data, 'sum'));

        $this->data = $data;
        $this->days = $days;
        $this->singleData = ['fullSum' => $fullSum];
    }


};
?>

@placeholder
<div class="card">
    <div class="card-header">
        <div class="row">
            <div class="col">
                <h4>Tržby – posledních 7 dní</h4>
            </div>
        </div>
    </div>
    <div class="card-body">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
        </div>
    </div>
</div>
@endplaceholder

<div class="card">
    <div class="card-header">
        <div class="row align-items-center">
            <div class="col">
                <h4>Tržby – posledních 7 dní</h4>
            </div>
            <div class="col d-flex align-items-center gap-3 justify-content-end">
                <x-input label="Od" wire:model="from" type="date" wire:input="loadData()" margin="1"/>
                <x-input label="Do" wire:model="to" type="date" wire:input="loadData()" margin="1"/>
            </div>
        </div>
    </div>
    <div class="card-body">
        <div class="spinner-border text-primary" role="status" wire:loading wire:target="loadData">
            <span class="visually-hidden">Loading...</span>
        </div>

        @if ($data != [])
            <div class="table-responsive">
                <table class="table align-middle mb-0 table-hover table-centered" wire:loading.remove wire:target="loadData">
                    <thead class="bg-light">
                        <tr>
                            <td style="min-width:150px;">Datum</td>
                            @foreach ($data as $branchH)
                                <td style="min-width:150px;">
                                    <div class="d-flex gap-1 align-items-center justify-content-end">
                                        <div style="width: 8px; height:8px; border-radius: 50%; background-color:{{$branchH['color']}};" ></div>
                                        <p class="mb-0">{{$branchH['name']}}</p>
                                    </div>
                                </td>
                            @endforeach
                            <td class="sticky-col-right bg-light" style="min-width:150px; text-align: right;" >Celkem</td>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($days as $keyDay => $day)
                        <tr>
                            <td><strong>{{ $day['label'] }}</strong></td>
                            @foreach ($data as $branch)
                            <td style="text-align: right;"><p class="mb-0" style="white-space: nowrap;">
                                @if(is_null($branch['data'][$keyDay]))
                                -
                                @else
                                {{ formatMoney($branch['data'][$keyDay], false) }} Kč
                                @endif
                            </p></td>
                            @endforeach
                            <td class="sticky-col-right bg-light-subtle" style="text-align: right;">
                                {{formatMoney($day['sum'], false)}} Kč
                            </td>
                        </tr>
                        @endforeach
                        <tr class="bg-light">
                            <td><strong>Celkem</strong></td>
                            @foreach ($data as $finalBranch)
                                <td style="text-align: right;">{{formatMoney($finalBranch['sum'], false)}} Kč</td>
                            @endforeach
                            <td class="sticky-col-right bg-light" style="text-align: right;">{{formatMoney($singleData['fullSum'] ?? 0, false)}} Kč</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        @else
            <p>Nenalezena žádná data</p>
        @endif
    </div>
</div>
