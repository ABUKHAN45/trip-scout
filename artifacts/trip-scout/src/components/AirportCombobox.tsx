import * as React from "react";
import { Check, ChevronsUpDown, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSearchAirports, getSearchAirportsQueryKey } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";

interface AirportComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  testId?: string;
}

export function AirportCombobox({ value, onChange, placeholder = "Select airport...", testId }: AirportComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: suggestions = [], isLoading } = useSearchAirports(
    { q: debouncedSearch },
    { query: { enabled: debouncedSearch.length > 1, queryKey: getSearchAirportsQueryKey({ q: debouncedSearch }) } }
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid={testId}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal text-left"
        >
          {value ? (
            <span className="flex items-center gap-2">
              <span className="font-semibold">{value}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search city or airport code..." 
            value={search}
            onValueChange={setSearch}
            data-testid={`${testId}-input`}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Searching..." : search.length > 1 ? "No airports found." : "Type to search..."}
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((airport) => (
                <CommandItem
                  key={airport.iata}
                  value={airport.iata}
                  data-testid={`${testId}-item-${airport.iata}`}
                  onSelect={(currentValue) => {
                    onChange(currentValue);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start py-2"
                >
                  <div className="flex items-center w-full">
                    <span className="font-semibold w-12 shrink-0">{airport.iata}</span>
                    <span className="truncate">{airport.city}, {airport.country}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value === airport.iata ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground pl-12 truncate w-full">{airport.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
