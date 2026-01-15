// This is a temporary file containing the corrected Financials section
// to be copied into stock-info-screen.tsx

                <CardContent>
                  <div className="space-y-6">
                    {/* Valuation Metrics */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm">Valuation</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {financials.market_cap && (
                          <div>
                            <p className="text-sm text-muted-foreground">Market Cap</p>
                            <p className="font-medium">{formatMarketCap(financials.market_cap)}</p>
                          </div>
                        )}
                        {financials.enterprise_value && (
                          <div>
                            <p className="text-sm text-muted-foreground">Enterprise Value</p>
                            <p className="font-medium">{formatMarketCap(financials.enterprise_value)}</p>
                          </div>
                        )}
                        {financials.pe_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">P/E Ratio (TTM)</p>
                            <p className="font-medium">{formatRatio(financials.pe_ttm)}</p>
                          </div>
                        )}
                        {financials.forward_pe && (
                          <div>
                            <p className="text-sm text-muted-foreground">Forward P/E</p>
                            <p className="font-medium">{formatRatio(financials.forward_pe)}</p>
                          </div>
                        )}
                        {financials.pb && (
                          <div>
                            <p className="text-sm text-muted-foreground">P/B Ratio</p>
                            <p className="font-medium">{formatRatio(financials.pb)}</p>
                          </div>
                        )}
                        {financials.ps_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">P/S Ratio (TTM)</p>
                            <p className="font-medium">{formatRatio(financials.ps_ttm)}</p>
                          </div>
                        )}
                        {financials.pfcf_share_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">P/FCF (TTM)</p>
                            <p className="font-medium">{formatRatio(financials.pfcf_share_ttm)}</p>
                          </div>
                        )}
                        {financials.pcf_share_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">P/CF (TTM)</p>
                            <p className="font-medium">{formatRatio(financials.pcf_share_ttm)}</p>
                          </div>
                        )}
                        {financials.ev_revenue_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">EV/Revenue</p>
                            <p className="font-medium">{formatRatio(financials.ev_revenue_ttm)}</p>
                          </div>
                        )}
                        {financials.ev_ebitda_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">EV/EBITDA</p>
                            <p className="font-medium">{formatRatio(financials.ev_ebitda_ttm)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Profitability & Growth */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm">Profitability & Growth</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {financials.eps_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">EPS (TTM)</p>
                            <p className="font-medium">{formatCurrency(financials.eps_ttm)}</p>
                          </div>
                        )}
                        {financials.revenue_per_share_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue/Share (TTM)</p>
                            <p className="font-medium">{formatCurrency(financials.revenue_per_share_ttm)}</p>
                          </div>
                        )}
                        {financials.ebitda_per_share_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">EBITDA/Share (TTM)</p>
                            <p className="font-medium">{formatCurrency(financials.ebitda_per_share_ttm)}</p>
                          </div>
                        )}
                        {financials.cash_flow_per_share_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Cash Flow/Share (TTM)</p>
                            <p className="font-medium">{formatCurrency(financials.cash_flow_per_share_ttm)}</p>
                          </div>
                        )}
                        {financials.eps_growth_ttm_yoy !== null && financials.eps_growth_ttm_yoy !== undefined && (
                          <div>
                            <p className="text-sm text-muted-foreground">EPS Growth (YoY)</p>
                            <p className={`font-medium ${financials.eps_growth_ttm_yoy >= 0 ? 'text-positive' : 'text-negative'}`}>
                              {formatPercentage(financials.eps_growth_ttm_yoy)}
                            </p>
                          </div>
                        )}
                        {financials.revenue_growth_ttm_yoy !== null && financials.revenue_growth_ttm_yoy !== undefined && (
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue Growth (YoY)</p>
                            <p className={`font-medium ${financials.revenue_growth_ttm_yoy >= 0 ? 'text-positive' : 'text-negative'}`}>
                              {formatPercentage(financials.revenue_growth_ttm_yoy)}
                            </p>
                          </div>
                        )}
                        {financials.eps_growth_3y && (
                          <div>
                            <p className="text-sm text-muted-foreground">EPS Growth (3Y CAGR)</p>
                            <p className="font-medium">{formatPercentageNoSign(financials.eps_growth_3y)}</p>
                          </div>
                        )}
                        {financials.eps_growth_5y && (
                          <div>
                            <p className="text-sm text-muted-foreground">EPS Growth (5Y CAGR)</p>
                            <p className="font-medium">{formatPercentageNoSign(financials.eps_growth_5y)}</p>
                          </div>
                        )}
                        {financials.revenue_growth_3y && (
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue Growth (3Y)</p>
                            <p className="font-medium">{formatPercentageNoSign(financials.revenue_growth_3y)}</p>
                          </div>
                        )}
                        {financials.revenue_growth_5y && (
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue Growth (5Y)</p>
                            <p className="font-medium">{formatPercentageNoSign(financials.revenue_growth_5y)}</p>
                          </div>
                        )}
                        {financials.ebitda_cagr_5y && (
                          <div>
                            <p className="text-sm text-muted-foreground">EBITDA CAGR (5Y)</p>
                            <p className="font-medium">{formatPercentageNoSign(financials.ebitda_cagr_5y)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Margins */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm">Margins</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {financials.net_profit_margin_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Net Profit Margin</p>
                            <p className="font-medium">{formatPercentageFromDecimal(financials.net_profit_margin_ttm)}</p>
                          </div>
                        )}
                        {financials.operating_margin_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Operating Margin</p>
                            <p className="font-medium">{formatPercentageFromDecimal(financials.operating_margin_ttm)}</p>
                          </div>
                        )}
                        {financials.gross_margin_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Gross Margin</p>
                            <p className="font-medium">{formatPercentageFromDecimal(financials.gross_margin_ttm)}</p>
                          </div>
                        )}
                        {financials.pretax_margin_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Pretax Margin</p>
                            <p className="font-medium">{formatPercentageFromDecimal(financials.pretax_margin_ttm)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Returns */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm">Returns</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {financials.roa_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Return on Assets (TTM)</p>
                            <p className="font-medium">{formatPercentageFromDecimal(financials.roa_ttm)}</p>
                          </div>
                        )}
                        {financials.roe_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Return on Equity (TTM)</p>
                            <p className="font-medium">{formatPercentageFromDecimal(financials.roe_ttm)}</p>
                          </div>
                        )}
                        {financials.roi_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Return on Investment (TTM)</p>
                            <p className="font-medium">{formatPercentageFromDecimal(financials.roi_ttm)}</p>
                          </div>
                        )}
                        {financials.roa_5y && (
                          <div>
                            <p className="text-sm text-muted-foreground">ROA (5Y Avg)</p>
                            <p className="font-medium">{formatPercentageNoSign(financials.roa_5y)}</p>
                          </div>
                        )}
                        {financials.roe_5y && (
                          <div>
                            <p className="text-sm text-muted-foreground">ROE (5Y Avg)</p>
                            <p className="font-medium">{formatPercentageNoSign(financials.roe_5y)}</p>
                          </div>
                        )}
                        {financials.roi_5y && (
                          <div>
                            <p className="text-sm text-muted-foreground">ROI (5Y Avg)</p>
                            <p className="font-medium">{formatPercentageNoSign(financials.roi_5y)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Balance Sheet Ratios */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm">Balance Sheet</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {financials.book_value_per_share_annual && (
                          <div>
                            <p className="text-sm text-muted-foreground">Book Value/Share</p>
                            <p className="font-medium">{formatCurrency(financials.book_value_per_share_annual)}</p>
                          </div>
                        )}
                        {financials.tangible_book_value_per_share_annual && (
                          <div>
                            <p className="text-sm text-muted-foreground">Tangible Book Value/Share</p>
                            <p className="font-medium">{formatCurrency(financials.tangible_book_value_per_share_annual)}</p>
                          </div>
                        )}
                        {financials.cash_per_share_annual && (
                          <div>
                            <p className="text-sm text-muted-foreground">Cash/Share</p>
                            <p className="font-medium">{formatCurrency(financials.cash_per_share_annual)}</p>
                          </div>
                        )}
                        {financials.current_ratio_annual && (
                          <div>
                            <p className="text-sm text-muted-foreground">Current Ratio</p>
                            <p className="font-medium">{formatRatio(financials.current_ratio_annual)}</p>
                          </div>
                        )}
                        {financials.quick_ratio_annual && (
                          <div>
                            <p className="text-sm text-muted-foreground">Quick Ratio</p>
                            <p className="font-medium">{formatRatio(financials.quick_ratio_annual)}</p>
                          </div>
                        )}
                        {financials.long_term_debt_equity_annual && (
                          <div>
                            <p className="text-sm text-muted-foreground">LT Debt/Equity</p>
                            <p className="font-medium">{formatRatio(financials.long_term_debt_equity_annual)}</p>
                          </div>
                        )}
                        {financials.total_debt_total_equity_annual && (
                          <div>
                            <p className="text-sm text-muted-foreground">Total Debt/Equity</p>
                            <p className="font-medium">{formatRatio(financials.total_debt_total_equity_annual)}</p>
                          </div>
                        )}
                        {financials.book_value_share_growth_5y && (
                          <div>
                            <p className="text-sm text-muted-foreground">Book Value Growth (5Y)</p>
                            <p className="font-medium">{formatPercentageNoSign(financials.book_value_share_growth_5y)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Efficiency Metrics */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm">Efficiency</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {financials.asset_turnover_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Asset Turnover</p>
                            <p className="font-medium">{formatRatio(financials.asset_turnover_ttm)}</p>
                          </div>
                        )}
                        {financials.inventory_turnover_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Inventory Turnover</p>
                            <p className="font-medium">{formatRatio(financials.inventory_turnover_ttm)}</p>
                          </div>
                        )}
                        {financials.receivables_turnover_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Receivables Turnover</p>
                            <p className="font-medium">{formatRatio(financials.receivables_turnover_ttm)}</p>
                          </div>
                        )}
                        {financials.revenue_employee_ttm && (
                          <div>
                            <p className="text-sm text-muted-foreground">Revenue/Employee</p>
                            <p className="font-medium">{formatMarketCap(financials.revenue_employee_ttm * 1000000)}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dividends section - only show if dividend data exists */}
                    {(financials.current_dividend_yield_ttm || financials.dividend_per_share_ttm || financials.payout_ratio_ttm) && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-3 text-sm">Dividends</h4>
                          <div className="grid grid-cols-2 gap-4">
                            {financials.current_dividend_yield_ttm && (
                              <div>
                                <p className="text-sm text-muted-foreground">Dividend Yield</p>
                                <p className="font-medium">{formatPercentageNoSign(financials.current_dividend_yield_ttm)}</p>
                              </div>
                            )}
                            {financials.dividend_per_share_ttm && (
                              <div>
                                <p className="text-sm text-muted-foreground">Dividend/Share (TTM)</p>
                                <p className="font-medium">{formatCurrency(financials.dividend_per_share_ttm)}</p>
                              </div>
                            )}
                            {financials.dividend_indicated_annual && (
                              <div>
                                <p className="text-sm text-muted-foreground">Indicated Annual Dividend</p>
                                <p className="font-medium">{formatCurrency(financials.dividend_indicated_annual)}</p>
                              </div>
                            )}
                            {financials.payout_ratio_ttm && (
                              <div>
                                <p className="text-sm text-muted-foreground">Payout Ratio</p>
                                <p className="font-medium">{formatPercentageNoSign(financials.payout_ratio_ttm)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Data timestamp */}
                    {financials.fetched_at && (
                      <div className="text-xs text-muted-foreground text-right pt-2">
                        Last updated: {formatDate(financials.fetched_at)}
                      </div>
                    )}
                  </div>
                </CardContent>
